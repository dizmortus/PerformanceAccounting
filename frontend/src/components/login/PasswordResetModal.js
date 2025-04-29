'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { 
  initiatePasswordReset, 
  verifyResetCode, 
  changePasswordAfterReset 
} from "../../utils/auth";

const PasswordResetModal = ({ onClose, initialLogin = '' }) => {
  const router = useRouter();
  const [step, setStep] = useState(1); // Start with step 1 by default
  const [login, setLogin] = useState(initialLogin);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const isSuccessMessage = message.includes('успешно') || 
  message.includes('отправлен') || 
  message.includes('вход') ||
  message === 'Вы можете установить новый пароль';
  // Check if we should skip to step 3 if initialLogin is provided
  useEffect(() => {
    if (initialLogin) {
      checkUserStatus(initialLogin);
    }
  }, [initialLogin]);

  const checkUserStatus = async (login) => {
    try {
      const response = await initiatePasswordReset(login);
      if (response.status === 'Смена пароля') {
        setStep(3);
        setMessage('Вы можете установить новый пароль');
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [step, timer]);


  const handleAutoLogin = async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: username, password })
      });
      
      if (!res.ok) {
        throw new Error('Ошибка автоматического входа');
      }

      const data = await res.json();
      const decoded = jwtDecode(data.accessToken);
      
      if (decoded.status === 'Заблокированный') {
        throw new Error('Ваш аккаунт заблокирован');
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      if (decoded.role === 'Администратор') {
        router.push('/admin');
      } else if (decoded.role === 'Преподаватель') {
        router.push('/teacher');
      } else if (decoded.role === 'Гость') {
        router.push('/guest');
      }
    } catch (error) {
      setMessage(error.message || 'Ошибка автоматического входа');
    }
  };

  const handleInitiateReset = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const response = await initiatePasswordReset(login);
      
      // Check if user is already in password change mode
      if (response.status === 'Смена пароля') {
        setStep(3);
        setMessage('Вы можете установить новый пароль');
      } else {
        setMaskedEmail(response.maskedEmail);
        setMessage(`Код отправлен на ${response.maskedEmail}`);
        setStep(2);
        setTimer(60);
        setCanResend(false);
      }
    } catch (error) {
      setMessage(error.message || 'Ошибка при отправке кода');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      await initiatePasswordReset(login);
      setMessage(`Код повторно отправлен на ${maskedEmail}`);
      setTimer(60);
      setCanResend(false);
    } catch (error) {
      setMessage(error.message || 'Ошибка при отправке кода');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      await verifyResetCode(login, code);
      setStep(3);
    } catch (error) {
      setMessage(error.message || 'Неверный код подтверждения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      if (newPassword !== confirmPassword) {
        throw new Error('Пароли не совпадают');
      }
      
      await changePasswordAfterReset(login, newPassword);
      setMessage('Пароль успешно изменен! Выполняется вход...');
      
      // Выполняем автоматический вход с новым паролем
      await handleAutoLogin(login, newPassword);
      
      onClose();
    } catch (error) {
      setMessage(error.message || 'Ошибка при смене пароля');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-10 rounded-lg shadow-lg w-full max-w-lg">
      <div className="flex justify-between items-center mb-6">
  <h3 className="text-2xl font-semibold text-gray-900">
    {step === 3 ? 'Смена пароля' : 'Восстановление пароля'}
  </h3>
  <button 
    onClick={onClose} 
    className="text-gray-500 hover:text-gray-700 text-4xl p-2 -mr-2"
    disabled={isLoading}
    aria-label="Закрыть"
  >
    &times;
  </button>
</div>
        
        {message && (
            <div className={`mb-6 p-3 rounded-lg ${
  isSuccessMessage ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
}`}>
            {message}
          </div>
        )}


{step === 1 && (
  <form className="space-y-5">
    <div>
      <input
        type="text"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
        placeholder="Ваш логин"
        disabled={isLoading}
        autoComplete="username"
      />
    </div>
    <button
      type="button"
      onClick={handleInitiateReset}
      disabled={!login || isLoading}
      className="w-full py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold rounded-lg transition-colors duration-300 hover:from-teal-600 hover:to-blue-600 shadow-md hover:shadow-lg disabled:opacity-50"
    >
      {isLoading ? 'Ожидайте...' : 'Продолжить'}
    </button>
  </form>
)}

{step === 2 && (
  <form className="space-y-5">
    <p className="text-sm text-gray-600 mb-4">
      Введите 6-значный код из письма (например, A7B9C3)
    </p>
    <div>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
        className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase shadow-sm"
        placeholder="A1B2C3"
        disabled={isLoading}
      />
    </div>
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">
        {canResend ? 'Код можно отправить повторно' : `Повторная отправка через ${timer} сек`}
      </span>
      <button
  type="button"
  onClick={handleResendCode}
  disabled={!canResend || isLoading}
  className="text-sm text-blue-500 hover:text-blue-700 disabled:text-gray-400"
>
  Отправить код повторно
</button>
    </div>
    <button
      type="button"
      onClick={handleVerifyCode}
      disabled={code.length !== 6 || isLoading}
      className="w-full py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold rounded-lg transition-colors duration-300 hover:from-teal-600 hover:to-blue-600 shadow-md hover:shadow-lg disabled:opacity-50"
    >
      {isLoading ? 'Проверка...' : 'Подтвердить код'}
    </button>
  </form>
)}

{step === 3 && (
  <form className="space-y-5">
    <div>
      <div className="relative">
        <input
          type={showNewPassword ? "text" : "password"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10 shadow-sm"
          placeholder="Введите новый пароль"
          disabled={isLoading}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShowNewPassword(!showNewPassword)}
          className="absolute inset-y-0 right-2 flex items-center text-gray-600 shadow-sm"
        >
          {showNewPassword ? "👁" : "👁‍🗨"}
        </button>
      </div>
    </div>
    <div>
      <div className="relative">
        <input
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10 shadow-sm"
          placeholder="Повторите новый пароль"
          disabled={isLoading}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          className="absolute inset-y-0 right-2 flex items-center text-gray-600 shadow-sm"
        >
          {showConfirmPassword ? "👁" : "👁‍🗨"}
        </button>
      </div>
    </div>
    <button
      type="button"
      onClick={handleChangePassword}
      disabled={!newPassword || !confirmPassword || isLoading}
      className="w-full py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold rounded-lg transition-colors duration-300 hover:from-teal-600 hover:to-blue-600 shadow-md hover:shadow-lg disabled:opacity-50"
    >
      {isLoading ? 'Сохранение...' : 'Сохранить новый пароль'}
    </button>
  </form>
)}
      </div>
    </div>
  );
};

export default PasswordResetModal;