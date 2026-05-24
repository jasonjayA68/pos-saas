import { Breadcrumbs } from "./breadcrumbs";
import { MobileNav } from "./mobile-nav";
import { NotificationDropdown } from "./notification-dropdown";
import { ProfileDropdown } from "./profile-dropdown";
import { ThemeToggle } from "./theme-toggle";

type TopbarProps = {
  businessName: string;
  fullName: string;
  email: string;
  roleName: string;
};

export function Topbar({
  businessName,
  fullName,
  email,
  roleName,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-950">
      <MobileNav businessName={businessName} />
      <div className="flex-1 overflow-hidden">
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationDropdown />
        <ProfileDropdown
          fullName={fullName}
          email={email}
          roleName={roleName}
        />
      </div>
    </header>
  );
}
