import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Trash2, ArrowLeft } from 'lucide-react';

const Chat = ({ initialContact, onMessageRead, isEmbedded = false, forcedContact = null }) => {
    const { user } = useAuth();
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(forcedContact || initialContact || null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(!forcedContact && !initialContact);
    const [filterSubject, setFilterSubject] = useState('All');
    // Mobile: 'contacts' shows sidebar, 'chat' shows chat area
    const [mobileView, setMobileView] = useState(initialContact ? 'chat' : 'contacts');
    const chatEndRef = useRef(null);

    // Fetch Contacts
    useEffect(() => {
        if (isEmbedded && forcedContact) {
            setSelectedContact(forcedContact);
            setLoading(false);
            return;
        }

        const fetchContacts = async () => {
            try {
                const res = await api.get('/communication/contacts');
                let fetchedContacts = Array.isArray(res.data) ? res.data : [];

                if (initialContact) {
                    const exists = fetchedContacts.find(c => c.ContactID === initialContact.ContactID);
                    if (!exists) fetchedContacts = [initialContact, ...fetchedContacts];
                    setSelectedContact(initialContact);
                }

                setContacts(fetchedContacts);
            } catch (err) {
                console.error("Failed to fetch contacts", err);
            } finally {
                setLoading(false);
            }
        };

        fetchContacts();
    }, [initialContact, isEmbedded, forcedContact]);

    // Fetch Messages
    useEffect(() => {
        if (!selectedContact) return;

        const fetchMessages = async () => {
            try {
                const res = await api.get(`/communication/messages/${selectedContact.ContactID}`);
                setMessages(res.data);
                if (onMessageRead) onMessageRead();
                scrollToBottom();
            } catch (err) {
                console.error("Failed to fetch messages", err);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [selectedContact, onMessageRead]);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact) return;

        try {
            await api.post('/communication/messages', {
                receiverId: selectedContact.ContactID,
                message: newMessage
            });

            setMessages(prev => [...prev, {
                ChatID: 'temp-' + Date.now(),
                SenderID: user.id || 'me',
                ReceiverID: selectedContact.ContactID,
                Message: newMessage,
                Timestamp: new Date().toISOString()
            }]);
            setNewMessage('');
            scrollToBottom();
        } catch (err) {
            console.error("Failed to send", err);
            toast.error("Failed to send message");
        }
    };

    const handleSelectContact = (contact) => {
        setSelectedContact(contact);
        setMobileView('chat');
        // Optimistically clear unread count for this contact
        setContacts(prev => prev.map(c =>
            c.ContactID === contact.ContactID ? { ...c, UnreadCount: 0 } : c
        ));
    };

    const handleDeleteChat = (contact, e) => {
        e.stopPropagation();
        toast((t) => (
            <span className="flex items-center gap-3">
                <span className="text-sm">Delete chat with <b>{contact.ContactName}</b>?</span>
                <button
                    onClick={() => {
                        toast.dismiss(t.id);
                        api.delete(`/communication/messages/${contact.ContactID}`)
                            .then(() => {
                                setContacts(prev => prev.filter(c => c.ContactID !== contact.ContactID));
                                if (selectedContact?.ContactID === contact.ContactID) {
                                    setSelectedContact(null);
                                    setMobileView('contacts');
                                }
                                toast.success("Chat deleted.");
                            })
                            .catch(() => toast.error("Failed to delete."));
                    }}
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded font-bold"
                >Delete</button>
                <button onClick={() => toast.dismiss(t.id)} className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded">Cancel</button>
            </span>
        ), { duration: 6000 });
    };

    const uniqueSubjects = ['All', ...new Set(contacts.map(c => c.SubjectName).filter(Boolean))];
    const filteredContacts = filterSubject === 'All'
        ? contacts
        : contacts.filter(c => c.SubjectName === filterSubject);

    // Embedded (read-only one-contact view used by parent dashboard)
    if (isEmbedded) {
        return (
            <div className="flex flex-col h-[400px] sm:h-[500px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 bg-blue-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">{selectedContact?.ContactName}</h3>
                        <p className="text-xs text-blue-600">Teacher • {selectedContact?.SubjectName}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-blue-50/30">
                    {messages.map((msg, idx) => {
                        const isMe = msg.SenderID === user.id || msg.SenderID === 'me';
                        return (
                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                                    <p>{msg.Message}</p>
                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {new Date(msg.Timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Message teacher..."
                        className="flex-1 bg-blue-50/50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="submit" className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-md">
                        <svg className="w-4 h-4 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </form>
            </div>
        );
    }

    // Full Chat UI — responsive two-panel layout
    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg animate-fade-in-up"
            style={{ height: 'calc(100svh - 220px)', minHeight: '480px' }}>
            <div className="flex h-full">

                {/* Contacts Sidebar — full width on mobile when mobileView==='contacts' */}
                <div className={`
                    ${mobileView === 'contacts' ? 'flex' : 'hidden'}
                    md:flex
                    w-full md:w-80 lg:w-1/3
                    flex-col
                    bg-blue-50 border-r border-slate-200
                    flex-shrink-0
                `}>
                    <div className="p-4 border-b border-slate-200 bg-white">
                        <h2 className="text-lg font-bold text-slate-900">Messages</h2>

                        {uniqueSubjects.length > 2 && (
                            <div className="mt-2">
                                <select
                                    value={filterSubject}
                                    onChange={(e) => setFilterSubject(e.target.value)}
                                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    {uniqueSubjects.map(sub => (
                                        <option key={sub} value={sub}>{sub === 'All' ? 'All Classes' : sub}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                            {filteredContacts.length} Contacts
                            {filteredContacts.reduce((sum, c) => sum + (c.UnreadCount || 0), 0) > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                                    {filteredContacts.reduce((sum, c) => sum + (c.UnreadCount || 0), 0)} unread
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <p className="p-4 text-slate-400 text-sm">Loading contacts...</p>
                        ) : filteredContacts.length === 0 ? (
                            <p className="p-4 text-slate-400 text-sm text-center">No contacts found.</p>
                        ) : (
                            filteredContacts.map((contact, idx) => {
                                const initials = contact.ContactName
                                    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
                                const hasUnread = contact.UnreadCount > 0;
                                const isSelected = selectedContact?.ContactID === contact.ContactID;
                                return (
                                    <div
                                        key={`${contact.ContactID}-${contact.SubjectName}-${idx}`}
                                        onClick={() => handleSelectContact(contact)}
                                        className={`px-4 py-3 cursor-pointer transition border-b border-slate-100 hover:bg-white flex items-center gap-3 group ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : hasUnread ? 'bg-blue-50/40' : ''}`}
                                    >
                                        {/* Avatar */}
                                        <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                            {initials}
                                        </div>

                                        {/* Text */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex justify-between items-baseline gap-1">
                                                <span className={`text-sm truncate ${hasUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                                    {contact.ContactName}
                                                </span>
                                                {contact.LastMessageTime && (
                                                    <span className={`text-[10px] flex-shrink-0 ${hasUnread ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
                                                        {(() => {
                                                            const d = new Date(contact.LastMessageTime);
                                                            const now = new Date();
                                                            const isToday = d.toDateString() === now.toDateString();
                                                            return isToday
                                                                ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                                        })()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center mt-0.5 gap-1">
                                                <span className={`text-xs truncate ${hasUnread ? 'text-slate-700' : 'text-slate-400'}`}>
                                                    {contact.LastMessage
                                                        ? contact.LastMessage
                                                        : <span className="italic">{contact.Role}{contact.SubjectName ? ` • ${contact.SubjectName}` : ''}</span>
                                                    }
                                                </span>
                                                {hasUnread && (
                                                    <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                                        {contact.UnreadCount > 9 ? '9+' : contact.UnreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Delete (hover) */}
                                        <button
                                            onClick={(e) => handleDeleteChat(contact, e)}
                                            className="p-1.5 ml-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition flex-shrink-0"
                                            title="Delete Chat"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Chat Area — full width on mobile when mobileView==='chat' */}
                <div className={`
                    ${mobileView === 'chat' ? 'flex' : 'hidden'}
                    md:flex
                    flex-1 flex-col bg-white min-w-0
                `}>
                    {selectedContact ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-3 md:p-4 border-b border-slate-200 bg-white flex items-center gap-2 shadow-sm z-10">
                                {/* Back button — mobile only */}
                                <button
                                    onClick={() => setMobileView('contacts')}
                                    className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                                    aria-label="Back to contacts"
                                >
                                    <ArrowLeft size={20} />
                                </button>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-slate-900 truncate">{selectedContact.ContactName}</h3>
                                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Online
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        toast((t) => (
                                            <span className="flex items-center gap-3">
                                                <span className="text-sm">Clear conversation?</span>
                                                <button
                                                    onClick={async () => {
                                                        toast.dismiss(t.id);
                                                        try {
                                                            await api.delete(`/communication/messages/${selectedContact.ContactID}`);
                                                            setMessages([]);
                                                            toast.success("Chat cleared.");
                                                        } catch (e) { toast.error("Failed to delete."); }
                                                    }}
                                                    className="px-2 py-1 bg-red-500 text-white text-xs rounded font-bold"
                                                >Clear</button>
                                                <button onClick={() => toast.dismiss(t.id)} className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded">Cancel</button>
                                            </span>
                                        ), { duration: 6000 });
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                                    title="Clear Conversation"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 custom-scrollbar bg-blue-50/20">
                                {messages.length === 0 && (
                                    <p className="text-center text-slate-400 text-sm py-8">No messages yet. Say hello!</p>
                                )}
                                {messages.map((msg, idx) => {
                                    const isMe = msg.SenderID === user.id || msg.SenderID === 'me';
                                    return (
                                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'}`}>
                                                <p className="leading-relaxed">{msg.Message}</p>
                                                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                                    {new Date(msg.Timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input */}
                            <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t border-slate-200 bg-white flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-blue-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                                <button type="submit" className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-lg shadow-blue-500/20 flex-shrink-0">
                                    <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Desktop empty state — hidden on mobile since sidebar is shown instead */
                        <div className="flex-1 hidden md:flex flex-col items-center justify-center text-slate-400 bg-blue-50/20">
                            <div className="w-20 h-20 bg-white rounded-full border border-slate-200 flex items-center justify-center mb-4 text-4xl shadow-sm">💬</div>
                            <p className="font-medium text-slate-600">Select a contact to start chatting</p>
                            <p className="text-sm text-slate-400 mt-1">Choose from the list on the left</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Chat;
