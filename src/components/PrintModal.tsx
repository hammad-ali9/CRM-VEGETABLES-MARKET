import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';

interface PrintModalProps {
  title: string;
  onClose: () => void;
  onPrint: (period: 'daily' | 'weekly' | 'monthly' | 'all') => void;
}

const PrintModal: React.FC<PrintModalProps> = ({ title, onClose, onPrint }) => {
  const [selected, setSelected] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('monthly');

  const options: { value: 'daily' | 'weekly' | 'monthly' | 'all'; label: string; desc: string }[] = [
    { value: 'daily',   label: 'یومیہ',     desc: 'صرف آج کے ریکارڈ' },
    { value: 'weekly',  label: 'ہفتہ وار',  desc: 'موجودہ ہفتے کے ریکارڈ' },
    { value: 'monthly', label: 'ماہانہ',    desc: 'موجودہ مہینے کے ریکارڈ' },
    { value: 'all',     label: 'کل وقت',    desc: 'مکمل تاریخ' },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3><Printer size={16} style={{ display: 'inline', marginRight: 8 }} />{title}</h3>
          <button className="topbar-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            پرنٹ کی مدت منتخب کریں
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {options.map(opt => (
              <label key={opt.value} onClick={() => setSelected(opt.value)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${selected === opt.value ? 'var(--blue)' : 'var(--border)'}`,
                background: selected === opt.value ? 'rgba(0,122,255,0.06)' : 'transparent',
              }}>
                <input type="radio" name="printPeriod" value={opt.value}
                  checked={selected === opt.value} onChange={() => setSelected(opt.value)}
                  style={{ display: 'none' }} />
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${selected === opt.value ? 'var(--blue)' : 'var(--border)'}`,
                  background: selected === opt.value ? 'var(--blue)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected === opt.value && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
                </div>
                <div>
                  <span style={{ fontWeight: 600 }}>{opt.label}</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>منسوخ</button>
          <button type="button" className="btn btn-primary" onClick={() => onPrint(selected)}>
            <Printer size={15} /> پرنٹ کریں
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintModal;
