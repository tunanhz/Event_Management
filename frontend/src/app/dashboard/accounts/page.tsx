"use client"

import React, { useState, useEffect } from "react"
import { clientApi } from "@/lib/client-api"
import { useAuth } from "@/context/AuthContext"
import { 
  Users, Search, UserPlus, ShieldAlert, CheckCircle2, 
  Trash2, UserCog, Lock, Unlock, Mail, X, Copy, Check
} from "lucide-react"

interface Account {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: "ADMIN" | "ORGANIZER" | "PARTICIPANT" | "STAFF";
  accountStatus: "ACTIVE" | "BANNED";
  avatar?: string;
  createdAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export default function AccountsPage() {
  const { user: currentUser } = useAuth()
  
  // State variables
  const [accounts, setAccounts] = useState<Account[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  })
  
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  
  // Modal State for creating Staff
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [staffName, setStaffName] = useState("")
  const [staffEmail, setStaffEmail] = useState("")
  const [staffPhone, setStaffPhone] = useState("")
  const [staffLoading, setStaffLoading] = useState(false)
  const [createdStaffCreds, setCreatedStaffCreds] = useState<{ email: string; passwordPlain: string } | null>(null)
  const [copied, setCopied] = useState(false)
  
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Fetch accounts from API
  const fetchAccounts = async () => {
    try {
      setLoading(true)
      setError("")
      
      const params = new URLSearchParams()
      params.append("page", String(page))
      params.append("limit", "10")
      if (search) params.append("search", search)
      if (roleFilter) params.append("role", roleFilter)
      if (statusFilter) params.append("status", statusFilter)
      
      const res = await clientApi.get<{
        success: boolean;
        data: Account[];
        meta?: Pagination;
      }>(`/users/admin?${params.toString()}`)
      
      if (res.success) {
        setAccounts(res.data)
        if (res.meta) {
          setPagination(res.meta)
        }
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách tài khoản")
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    // Only call api if logged in user is admin
    if (currentUser?.role === "ADMIN") {
      fetchAccounts()
    }
  }, [page, roleFilter, statusFilter, currentUser]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchAccounts()
  };

  // Toggle account status (Ban / Unban)
  const handleToggleStatus = async (id: string, currentStatus: "ACTIVE" | "BANNED") => {
    const nextStatus = currentStatus === "ACTIVE" ? "BANNED" : "ACTIVE"
    const confirmMsg = nextStatus === "BANNED" 
      ? "Bạn có chắc chắn muốn KHÓA tài khoản này không?" 
      : "Bạn có muốn MỞ KHÓA tài khoản này không?"
      
    if (!window.confirm(confirmMsg)) return

    try {
      setError("")
      setSuccess("")
      const res = await clientApi.post<{ success: boolean; data: Account }>(`/users/admin/${id}/status`, {
        status: nextStatus
      })
      if (res.success) {
        setSuccess(`Đã cập nhật trạng thái tài khoản thành ${nextStatus === "ACTIVE" ? "ĐANG HOẠT ĐỘNG" : "BỊ KHÓA"}`)
        // Update local state
        setAccounts(accounts.map(acc => acc._id === id ? { ...acc, accountStatus: nextStatus } : acc))
      }
    } catch (err: any) {
      setError(err.message || "Cập nhật trạng thái thất bại")
    }
  };

  // Update Account Role
  const handleUpdateRole = async (id: string, newRole: string) => {
    try {
      setError("")
      setSuccess("")
      const res = await clientApi.post<{ success: boolean; data: Account }>(`/users/admin/${id}/role`, {
        role: newRole
      })
      if (res.success) {
        setSuccess("Đã cập nhật vai trò tài khoản thành công!")
        // Update local state
        setAccounts(accounts.map(acc => acc._id === id ? { ...acc, role: newRole as any } : acc))
      }
    } catch (err: any) {
      setError(err.message || "Cập nhật vai trò thất bại")
    }
  };

  // Delete User Account
  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("HÀNH ĐỘNG NÀY KHÔNG THỂ KHÔI PHỤC! Bạn có chắc chắn muốn XÓA tài khoản này khỏi hệ thống không?")) return

    try {
      setError("")
      setSuccess("")
      const res = await clientApi.delete<{ success: boolean }>(`/users/admin/${id}`)
      if (res.success) {
        setSuccess("Đã xóa tài khoản khỏi hệ thống!")
        setAccounts(accounts.filter(acc => acc._id !== id))
      }
    } catch (err: any) {
      setError(err.message || "Xóa tài khoản thất bại")
    }
  };

  // Create Staff account submit handler
  const handleCreateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffName || !staffEmail) {
      setError("Vui lòng điền đầy đủ Tên và Email cho Staff")
      return
    }

    try {
      setStaffLoading(true)
      setError("")
      setSuccess("")
      
      const res = await clientApi.post<{ success: boolean; data: any }>(`/users/admin/staff`, {
        fullName: staffName,
        email: staffEmail,
        phone: staffPhone
      })
      
      if (res.success) {
        setSuccess(`Đã tạo tài khoản Staff cho ${staffName} thành công!`)
        
        
        setStaffName("")
        setStaffEmail("")
        setShowStaffModal(false)
        fetchAccounts()
      }
    } catch (err: any) {
      setError(err.message || "Tạo tài khoản Staff thất bại")
    } finally {
      setStaffLoading(false)
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-rose-100 text-rose-800 border border-rose-200"
      case "ORGANIZER":
        return "bg-purple-100 text-purple-800 border border-purple-200"
      case "STAFF":
        return "bg-amber-100 text-amber-800 border border-amber-200"
      default:
        return "bg-cyan-100 text-cyan-800 border border-cyan-200"
    }
  };

  const getStatusBadgeClass = (status: string) => {
    return status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
      : "bg-red-100 text-red-800 border border-red-200"
  };

  if (currentUser?.role !== "ADMIN") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center px-4">
        <ShieldAlert className="h-16 w-16 text-rose-500 mb-4 animate-bounce" />
        <h3 className="text-xl font-bold text-slate-800">Quyền truy cập bị từ chối</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          Chỉ tài khoản có vai trò Quản trị viên (ADMIN) mới có quyền truy cập trang quản lý tài khoản này.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Quản lý tài khoản & Phân quyền</h2>
          <p className="mt-1 text-sm text-slate-500">
            Quản trị và phân quyền tất cả tài khoản trong hệ thống EventBox.
          </p>
        </div>
        <button
          onClick={() => setShowStaffModal(true)}
          className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-700 transition-all shadow-md hover:shadow-lg cursor-pointer shrink-0"
        >
          <UserPlus className="h-4.5 w-4.5" />
          Thêm tài khoản STAFF
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 border border-rose-100 animate-shake">
          <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-100">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {/* Filter and Search Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm tài khoản theo tên hoặc email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm outline-none transition-all focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="">Tất cả vai trò</option>
                <option value="ADMIN">ADMIN - Quản trị</option>
                <option value="ORGANIZER">ORGANIZER - Tổ chức</option>
                <option value="STAFF">STAFF - Nhân viên</option>
                <option value="PARTICIPANT">PARTICIPANT - Người dùng</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">ACTIVE - Hoạt động</option>
                <option value="BANNED">BANNED - Khóa</option>
              </select>
            </div>

            <button
              type="submit"
              className="h-10 rounded-xl bg-slate-800 hover:bg-slate-900 px-5 text-sm font-bold text-white transition-colors cursor-pointer"
            >
              Tìm kiếm
            </button>
          </div>
        </form>
      </div>

      {/* Account Table List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-cyan-600"></div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-500">
            <Users className="h-12 w-12 text-slate-300 mb-2" />
            <p>Không tìm thấy tài khoản nào khớp với bộ lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Tài khoản</th>
                  <th className="px-6 py-4">Vai trò (Role)</th>
                  <th className="px-6 py-4">Trạng thái (Status)</th>
                  <th className="px-6 py-4">Ngày tạo</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {accounts.map((account) => {
                  const isSelf = account._id === currentUser?._id
                  return (
                    <tr key={account._id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name & Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                            style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}
                          >
                            {account.fullName ? account.fullName.charAt(0).toUpperCase() : "?"}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {account.fullName}
                              {isSelf && (
                                <span className="rounded bg-cyan-100 text-[10px] font-bold text-cyan-800 px-1 border border-cyan-200">
                                  Bạn
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">{account.email}</p>
                            {account.phone && <p className="text-[10px] text-slate-400 font-medium">📞 {account.phone}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Role selection dropdown */}
                      <td className="px-6 py-4">
                        {isSelf ? (
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRoleBadgeClass(account.role)}`}>
                            {account.role}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold mr-1 ${getRoleBadgeClass(account.role)}`}>
                              {account.role}
                            </span>
                            <select
                              value={account.role}
                              onChange={(e) => handleUpdateRole(account._id, e.target.value)}
                              className="text-xs rounded border border-slate-300 bg-white p-1 outline-none focus:border-cyan-500 cursor-pointer"
                              title="Thay đổi vai trò"
                            >
                              <option value="PARTICIPANT">PARTICIPANT</option>
                              <option value="ORGANIZER">ORGANIZER</option>
                              <option value="STAFF">STAFF</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(account.accountStatus)}`}>
                          {account.accountStatus === "ACTIVE" ? "Hoạt động" : "Bị khóa"}
                        </span>
                      </td>

                      {/* Date Created */}
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(account.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {/* Ban/Unban toggle */}
                          {!isSelf && (
                            <button
                              onClick={() => handleToggleStatus(account._id, account.accountStatus)}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all cursor-pointer shadow-sm hover:scale-105 ${
                                account.accountStatus === "ACTIVE"
                                  ? "border-red-200 text-red-600 hover:bg-red-50"
                                  : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={account.accountStatus === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                            >
                              {account.accountStatus === "ACTIVE" ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Unlock className="h-4 w-4" />
                              )}
                            </button>
                          )}

                          {/* Delete button */}
                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(account._id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer shadow-sm hover:scale-105"
                              title="Xóa tài khoản"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4">
              <span className="text-xs text-slate-500">
                Hiển thị trang <b>{pagination?.currentPage || 1}</b> trên tổng số <b>{pagination?.totalPages || 1}</b> trang ({pagination?.totalItems || 0} kết quả)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Trang trước
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination?.totalPages || 1, p + 1))}
                  disabled={page === (pagination?.totalPages || 1)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Trang sau
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Create Staff account */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-zoom-in">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-cyan-600" />
                Cấp tài khoản STAFF mới
              </h3>
              <button
                onClick={() => setShowStaffModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal content Form */}
            <form onSubmit={handleCreateStaffSubmit} className="mt-4 space-y-4">
              <p className="text-xs text-slate-500">
                Nhập tên và email nhân viên. Hệ thống sẽ tự động tạo mật khẩu ngẫu nhiên và gửi thông tin đăng nhập trực tiếp qua Email của nhân viên.
              </p>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Họ và tên Staff
                </label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3.5 text-sm text-slate-900 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="Lê Văn B"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email làm việc
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="staff-email@work.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Số điện thoại Staff
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-4.5 w-4.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="09xxxxxxxx"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 justify-end border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={staffLoading}
                  className="rounded-xl bg-cyan-600 px-5 py-2 text-sm font-bold text-white hover:bg-cyan-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {staffLoading ? "Đang tạo..." : "Xác nhận tạo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
