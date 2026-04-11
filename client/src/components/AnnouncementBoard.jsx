import { useState, useEffect } from 'react';
import api from '../api/axios';

const AnnouncementBoard = () => {
    const [announcements, setAnnouncements] = useState([]);

    useEffect(() => {
        const fetchAnn = async () => {
            try {
                const res = await api.get('/communication/announcements');
                setAnnouncements(res.data);
            } catch (err) { console.error(err); }
        };
        fetchAnn();
    }, []);

    if (announcements.length === 0) return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
            No announcements.
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Announcements</h3>
            <div className="space-y-4">
                {announcements.map(ann => (
                    <div key={ann.AnnouncementID} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-blue-900">{ann.Title}</h4>
                            <span className="text-xs text-blue-500">{new Date(ann.Date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-blue-800">{ann.Content}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnnouncementBoard;
