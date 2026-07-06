/** Mock team members for an event's "Thành viên" page. */

export interface EventMember {
  id: string
  name: string
  code: string // staff/student code, e.g. "HE180437"
  role: string
  email: string
  online: boolean
}

export const eventMembers: EventMember[] = [
  {
    id: "mem-1",
    name: "Tuấn Anh Dương",
    code: "HE180437",
    role: "Chủ sự kiện",
    email: "anhduongtf68@gmail.com",
    online: true,
  },
]
