'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, RefreshCw } from 'lucide-react';
import { adminSendTicketsToEmail, adminReissueTicket } from './actions';

interface Ticket {
  id: string;
  attendee_name: string | null;
  attendee_email: string | null;
  status: string;
  tier_name: string;
  order_id: string;
  created_at: string;
}

interface AdminTicketTableProps {
  tickets: Ticket[];
}

type ModalType = 'send-email' | 'reissue' | null;

export function AdminTicketTable({ tickets }: AdminTicketTableProps) {
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();

  // Send email state
  const [emailTo, setEmailTo] = useState('');
  const [emailName, setEmailName] = useState('');

  // Reissue state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [reissueReason, setReissueReason] = useState('');

  function openSendEmail(ticket: Ticket) {
    setSelectedTicket(ticket);
    setEmailTo(ticket.attendee_email || '');
    setEmailName(ticket.attendee_name || '');
    setFeedback(null);
    setModal('send-email');
  }

  function openReissue(ticket: Ticket) {
    setSelectedTicket(ticket);
    setNewName(ticket.attendee_name || '');
    setNewEmail(ticket.attendee_email || '');
    setReissueReason('');
    setFeedback(null);
    setModal('reissue');
  }

  function closeModal() {
    setModal(null);
    setSelectedTicket(null);
    setFeedback(null);
  }

  function handleSendEmail() {
    if (!selectedTicket || !emailTo.trim() || !emailName.trim()) return;
    startTransition(async () => {
      const result = await adminSendTicketsToEmail({
        ticketIds: [selectedTicket.id],
        recipientEmail: emailTo.trim(),
        recipientName: emailName.trim(),
      });
      if (result.success) {
        setFeedback({ type: 'success', message: `Email sent with ${result.data.sent} ticket(s).` });
        setTimeout(closeModal, 1500);
      } else {
        setFeedback({ type: 'error', message: result.error });
      }
    });
  }

  function handleReissue() {
    if (!selectedTicket || !newName.trim() || !newEmail.trim() || !reissueReason.trim()) return;
    startTransition(async () => {
      const result = await adminReissueTicket({
        orderId: selectedTicket.order_id,
        oldTicketId: selectedTicket.id,
        newAttendeeName: newName.trim(),
        newAttendeeEmail: newEmail.trim(),
        reason: reissueReason.trim(),
      });
      if (result.success) {
        setFeedback({ type: 'success', message: `Ticket reissued. Sending email to ${newEmail.trim()}...` });
        // Auto-send email with new ticket
        const emailResult = await adminSendTicketsToEmail({
          ticketIds: [result.data.newTicketId],
          recipientEmail: newEmail.trim(),
          recipientName: newName.trim(),
        });
        if (emailResult.success) {
          setFeedback({ type: 'success', message: `Ticket reissued and sent to ${newEmail.trim()}` });
        } else {
          setFeedback({ type: 'success', message: `Ticket reissued (email failed: ${emailResult.error})` });
        }
        setTimeout(() => {
          closeModal();
          router.refresh();
        }, 1500);
      } else {
        setFeedback({ type: 'error', message: result.error });
      }
    });
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Ticket ID</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Attendee</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Tier</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Order</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-mono text-xs text-slate-600">{t.id.slice(0, 8)}...</td>
                <td className="px-6 py-3">
                  <div className="text-slate-900 text-sm">{t.attendee_name || '—'}</div>
                  <div className="text-slate-500 text-xs">{t.attendee_email || ''}</div>
                </td>
                <td className="px-6 py-3 text-slate-700">{t.tier_name}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    t.status === 'valid' ? 'bg-emerald-100 text-emerald-700' :
                    t.status === 'used' ? 'bg-blue-100 text-blue-700' :
                    t.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-6 py-3 font-mono text-xs text-slate-600">{t.order_id.slice(0, 8)}...</td>
                <td className="px-6 py-3">
                  {t.status === 'valid' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openSendEmail(t)}
                        title="Send to Email"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openReissue(t)}
                        title="Reissue Ticket"
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No tickets issued yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Send Email Modal */}
      {modal === 'send-email' && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Send Ticket via Email</h3>
            <p className="text-sm text-slate-500 mb-4">
              Ticket #{selectedTicket.id.slice(0, 8)} &middot; {selectedTicket.tier_name}
            </p>

            <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Name</label>
            <input
              type="text"
              value={emailName}
              onChange={(e) => setEmailName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Email</label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            {feedback && (
              <p className={`text-sm font-medium mb-3 ${feedback.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                {feedback.message}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={closeModal} disabled={isPending} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isPending || !emailTo.trim() || !emailName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {isPending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reissue Modal */}
      {modal === 'reissue' && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Reissue Ticket</h3>
            <p className="text-sm text-slate-500 mb-4">
              Replacing ticket #{selectedTicket.id.slice(0, 8)} &middot; {selectedTicket.tier_name}
            </p>

            <label className="block text-sm font-medium text-slate-700 mb-1">New Attendee Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            <label className="block text-sm font-medium text-slate-700 mb-1">New Attendee Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Reissue</label>
            <input
              type="text"
              value={reissueReason}
              onChange={(e) => setReissueReason(e.target.value)}
              placeholder="e.g. Name change, transfer, lost ticket"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            {feedback && (
              <p className={`text-sm font-medium mb-3 ${feedback.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                {feedback.message}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={closeModal} disabled={isPending} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleReissue}
                disabled={isPending || !newName.trim() || !newEmail.trim() || !reissueReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
              >
                {isPending ? 'Reissuing...' : 'Reissue Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
