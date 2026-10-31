import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, SupportMessage } from '../services/api.js';
import { MessageCircle, Send, Paperclip, X, Loader2 } from 'lucide-react';

interface CustomerSupportChatProps {
  shipmentId: string;
  shipmentLabel: string;
  onClose: () => void;
}

export default function CustomerSupportChat({
  shipmentId,
  shipmentLabel,
  onClose,
}: CustomerSupportChatProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const result = await api.support.getMessages(shipmentId);
      setMessages(result.messages);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load your conversation.'
      );
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    void loadMessages();

    const interval = window.setInterval(() => {
      void loadMessages();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (event: React.FormEvent) => {
  console.log('HANDLE SEND STARTED');
  event.preventDefault();
    if ((!text.trim() && !selectedFile) || sending) return;

    setSending(true);
    setError('');

    try {
      let attachments: {
        name: string;
        url: string;
        type: string;
        size: number;
      }[] = [];

      if (selectedFile) {
        const result = await api.support.uploadAttachment(
          shipmentId,
          selectedFile
        );
        attachments = [result.attachment];
      }

      console.log('[SUPPORT] About to send message');
      await api.support.sendMessage(
        shipmentId,
        text.trim(),
        attachments
      );
console.log('[SUPPORT] Message sent successfully');
      setText('');
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await loadMessages();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Your message could not be sent.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      <header className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-4 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-full bg-blue-600 p-2">
            <MessageCircle size={20} />
          </div>

          <div className="min-w-0">
            <h2 className="font-semibold">Customer Support</h2>
            <p className="truncate text-xs text-slate-300">
              Shipment: {shipmentLabel}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close customer support chat"
          className="rounded-lg p-2 hover:bg-slate-700"
        >
          <X size={20} />
        </button>
      </header>

      <div className="flex max-h-[420px] min-h-[240px] flex-col gap-3 overflow-y-auto bg-slate-50 p-4">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            Loading conversation...
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="m-auto max-w-xs py-8 text-center text-sm text-slate-500">
            <MessageCircle className="mx-auto mb-3" size={30} />
            <p className="font-medium">Start a conversation</p>
            <p className="mt-1">
              Send a message to the admin about this shipment.
            </p>
          </div>
        )}

        {messages.map((message) => {
          const isCustomer = message.senderRole === 'customer';

          return (
            <div
              key={message.id}
              className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
            >
              <article
                className={`max-w-[85%] rounded-xl px-3 py-2 ${
                  isCustomer
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-800'
                }`}
              >
                <p className="mb-1 text-xs font-semibold opacity-80">
                  {isCustomer ? 'You' : message.senderName || 'Admin'}
                </p>

                {message.text && (
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {message.text}
                  </p>
                )}

                {message.attachments?.map((attachment, index) => (
                  <div key={`${message.id}-${index}`} className="mt-2">
                    {attachment.type.startsWith('image/') ? (
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open image ${attachment.name}`}
                      >
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="max-h-64 max-w-full rounded-lg object-contain"
                        />
                      </a>
                    ) : (
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`break-all text-sm underline ${
                          isCustomer ? 'text-white' : 'text-blue-700'
                        }`}
                      >
                        Open document: {attachment.name}
                      </a>
                    )}
                  </div>
                ))}

                <p className="mt-2 text-right text-[10px] opacity-70">
                  {new Date(message.createdAt).toLocaleString()}
                </p>
              </article>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p role="alert" className="bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {selectedFile && (
        <div className="flex items-center justify-between gap-3 border-t px-4 py-2 text-sm">
          <span className="truncate">{selectedFile.name}</span>

          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            aria-label="Remove selected attachment"
            className="rounded p-1 text-red-600 hover:bg-red-50"
          >
            <X size={18} />
          </button>
        </div>
      )}
<form
  onSubmit={(event) => {
    event.preventDefault();
    event.stopPropagation();

    console.log('[SUPPORT] Form submission intercepted');
    void handleSend(event);
  }}
  className="border-t bg-white p-3"
>
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;

              if (!file) return;

              if (file.size > 10 * 1024 * 1024) {
                setError('Files must be 10 MB or smaller.');
                event.target.value = '';
                return;
              }

              setError('');
              setSelectedFile(file);
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach an image or PDF"
            className="rounded-lg border border-slate-300 p-3 text-slate-600 hover:bg-slate-100"
          >
            <Paperclip size={19} />
          </button>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Write a message..."
            rows={1}
            maxLength={5000}
        className="min-w-0 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={sending || (!text.trim() && !selectedFile)}
            aria-label="Send message"
            className="rounded-lg bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="animate-spin" size={19} />
            ) : (
              <Send size={19} />
            )}
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Images and PDF documents · Maximum file size: 10 MB
        </p>
      </form>
    </section>
  );
}