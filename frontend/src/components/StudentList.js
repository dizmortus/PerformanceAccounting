'use client';

export default function StudentList({ students, selectedGroup }) {
    if (!selectedGroup) return null;

    return (
        <div className="w-full max-w-3xl bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 text-center mb-4">Группа {selectedGroup}</h2>
            <ul className="mt-4 space-y-2">
                {students.map(student => (
                    <li key={student.id} className="flex justify-between p-4 border-b border-gray-400 rounded-lg">
                        {student.name}
                        <input type="number" className="w-20 p-3 border bg-white text-gray-900 rounded-lg text-lg" min="0" max="100" />
                    </li>
                ))}
            </ul>
        </div>
    );
}
