import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Edit2, Trash2, Users, Loader2, ArrowLeft, X } from 'lucide-react';
import api from '../lib/api';

interface SeminarLab {
  id: string;
  name: string;
  description: string | null;
  teacher_name: string | null;
  student_count: number;
  is_active: boolean;
}

interface FormData {
  name: string;
  description: string;
}

export default function SeminarLabManagement() {
  const navigate = useNavigate();
  const [labs, setLabs] = useState<SeminarLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<SeminarLab | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchLabs();
  }, [showInactive]);

  const fetchLabs = async () => {
    try {
      setLoading(true);
      const response = await api.get<SeminarLab[]>('/master/seminar-labs', {
        params: { include_inactive: showInactive }
      });
      setLabs(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch seminar labs:', err);
      setError('ゼミ・研究室の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingLab(null);
    setFormData({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (lab: SeminarLab) => {
    setEditingLab(lab);
    setFormData({ name: lab.name, description: lab.description || '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLab(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      if (editingLab) {
        // Update existing lab
        await api.put(`/master/seminar-labs/${editingLab.id}`, formData);
      } else {
        // Create new lab
        await api.post('/master/seminar-labs', formData);
      }
      closeModal();
      fetchLabs();
    } catch (err) {
      console.error('Failed to save seminar lab:', err);
      alert('ゼミ・研究室の保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (labId: string) => {
    try {
      await api.delete(`/master/seminar-labs/${labId}`);
      setDeleteConfirm(null);
      fetchLabs();
    } catch (err: unknown) {
      console.error('Failed to delete seminar lab:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      alert(error.response?.data?.detail || '削除に失敗しました。所属している生徒がいないか確認してください。');
    }
  };

  const toggleLabActive = async (lab: SeminarLab) => {
    try {
      await api.put(`/master/seminar-labs/${lab.id}`, {
        is_active: !lab.is_active
      });
      fetchLabs();
    } catch (err) {
      console.error('Failed to toggle lab status:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#fef8f5]">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teacher/dashboard')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Building2 className="w-6 h-6" />
                ゼミ・研究室管理
              </h1>
              <p className="text-purple-200 text-sm">ゼミ・研究室の作成と生徒の割り当て</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            新規作成
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Filter toggle */}
        <div className="mb-6 flex justify-end">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            非アクティブも表示
          </label>
        </div>

        {/* Labs list */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-red-500">{error}</p>
            <button
              onClick={fetchLabs}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              再読み込み
            </button>
          </div>
        ) : labs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">ゼミ・研究室がありません</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              最初のゼミ・研究室を作成
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {labs.map((lab) => (
              <div
                key={lab.id}
                className={`bg-white rounded-xl shadow-md p-6 ${
                  !lab.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">{lab.name}</h3>
                      {!lab.is_active && (
                        <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                          非アクティブ
                        </span>
                      )}
                    </div>
                    {lab.description && (
                      <p className="text-gray-600 text-sm mb-3">{lab.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {lab.student_count}名
                      </span>
                      {lab.teacher_name && (
                        <span>担当: {lab.teacher_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(lab)}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="編集"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleLabActive(lab)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        lab.is_active
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                    >
                      {lab.is_active ? '無効化' : '有効化'}
                    </button>
                    {lab.student_count === 0 && (
                      <button
                        onClick={() => setDeleteConfirm(lab.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Delete confirmation */}
                {deleteConfirm === lab.id && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700 mb-3">
                      本当にこのゼミ・研究室を削除しますか？この操作は取り消せません。
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(lab.id)}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                      >
                        削除する
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                {editingLab ? 'ゼミ・研究室を編集' : '新しいゼミ・研究室を作成'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="例: AI研究室、環境ゼミ"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="このゼミ・研究室の研究内容や特徴を入力..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  disabled={submitting || !formData.name.trim()}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : editingLab ? (
                    '保存'
                  ) : (
                    '作成'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
