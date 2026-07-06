"use client"

import { useAuth } from "@/context/AuthContext"
import { AccountMenuDropdown } from "@/components/account/AccountMenuDropdown"
import styles from "./organizer-shell.module.css"

/**
 * Organizer topbar account chip — shared account dropdown (profile + logout)
 * with the shell's existing `.account` chip styling for the trigger.
 */
export function OrganizerAccountMenu() {
  const { user } = useAuth()
  const initial = user?.fullName?.charAt(0).toUpperCase() ?? "T"

  return (
    <AccountMenuDropdown profileHref="/organizer/profile" triggerClassName={styles.account}>
      {user?.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar} alt={user.fullName} className={styles.avatar} />
      ) : (
        <span className={styles.avatar} aria-hidden="true">
          {initial}
        </span>
      )}
      <span className={styles.accountName}>{user?.fullName ?? "Tài khoản"}</span>
    </AccountMenuDropdown>
  )
}
