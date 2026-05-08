'use client';

import { Header } from '@/components/header';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { uploadToStorage } from '@/lib/storage';
import { TeamMember } from '@/types';
import { Save, Plus, Trash2, Upload, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { generateId } from '@/lib/storage';

export default function EditorialPage() {
  const [description, setDescription] = useState('');
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    supabase.from('editorial_page').select('*').limit(1).single().then(({ data }) => {
      if (data) {
        setDescription(data.description ?? '');
        setTeam(data.team_members ?? []);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = { description, team_members: team, updated_at: new Date().toISOString() };
    if (isSupabaseConfigured()) {
      // Upsert — editorial_page has one row
      const { data: existing } = await supabase.from('editorial_page').select('id').limit(1).single();
      if (existing?.id) {
        await supabase.from('editorial_page').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('editorial_page').insert([payload]);
      }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addMember = () => {
    setTeam((prev) => [...prev, { id: generateId(), name: '', role: '', photo_url: undefined }]);
  };

  const removeMember = (id: string) => setTeam((prev) => prev.filter((m) => m.id !== id));

  const updateMember = (id: string, field: keyof TeamMember, value: string) => {
    setTeam((prev) => prev.map((m) => m.id === id ? { ...m, [field]: value } : m));
  };

  const MemberPhotoUpload = ({ member }: { member: TeamMember }) => {
    const [uploading, setUploading] = useState(false);
    const ref = useRef<HTMLInputElement>(null);
    const handle = async (file: File) => {
      setUploading(true);
      try {
        const url = await uploadToStorage('article-images', file, 'editorial');
        updateMember(member.id, 'photo_url', url);
      } catch {
        updateMember(member.id, 'photo_url', URL.createObjectURL(file));
      } finally { setUploading(false); }
    };
    return (
      <div className="flex-shrink-0">
        {member.photo_url ? (
          <img src={member.photo_url} alt={member.name} className="w-12 h-12 rounded-full object-cover border border-slate-200" />
        ) : (
          <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
            className="w-12 h-12 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50">
            {uploading ? <div className="animate-spin w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full" /> : <User size={16} />}
          </button>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Tahririyat haqida" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Tahririyat haqida" subtitle="Tahririyat sahifasini tahrirlang" />

      <div className="flex-1 p-8 space-y-6 max-w-3xl">
        {/* Description */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Tahririyat tavsifi</h3>
          <textarea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tahririyat haqida qisqacha ma'lumot..."
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Team */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Jamoa a&apos;zolari</h3>
            <button
              type="button"
              onClick={addMember}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Plus size={14} />
              Qo&apos;shish
            </button>
          </div>

          {team.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Hali a&apos;zo qo&apos;shilmagan</p>
          ) : (
            <div className="space-y-3">
              {team.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <MemberPhotoUpload member={member} />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => updateMember(member.id, 'name', e.target.value)}
                      placeholder="Ism"
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={member.role}
                      onChange={(e) => updateMember(member.id, 'role', e.target.value)}
                      placeholder="Lavozim"
                      className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">Saqlandi ✓</span>}
        </div>
      </div>
    </div>
  );
}
