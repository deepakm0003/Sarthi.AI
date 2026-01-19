"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BookText, Sheet, ImageIcon, BrainCircuit, Languages, LogOut, User, Users, GraduationCap, Headset } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";

const teacherNavItems = [
  { href: "/lesson-planner", icon: BookText, label: "Lesson Planner" },
  { href: "/classrooms", icon: Users, label: "Classrooms" },
  { href: "/grades", icon: GraduationCap, label: "Grades" },
  { href: "/differentiated-worksheets", icon: Sheet, label: "Worksheets" },
  { href: "/visual-aids", icon: ImageIcon, label: "Visual Aids" },
  { href: "/knowledge-base", icon: BrainCircuit, label: "Knowledge Base" },
  { href: "/local-content", icon: Languages, label: "Local Content" },
  { href: "/teacher-companion", icon: Headset, label: "Teacher Companion" },
];

const studentNavItems = [
  { href: "/classrooms", icon: Users, label: "Classrooms" },
  { href: "/grades", icon: GraduationCap, label: "Grades" },
  { href: "/knowledge-base", icon: BrainCircuit, label: "Knowledge Base" },
  { href: "/local-content", icon: Languages, label: "Local Content" },
];


const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "mr", label: "Marathi" },
  { value: "bn", label: "Bengali" },
  { value: "ta", label: "Tamil" },
] as const;

export function NavItems() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { state, isMobile } = useSidebar();
  const { t, i18n } = useTranslation();

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      router.push('/login');
      toast({
        variant: 'default',
        title: t("loggedOut"),
        description: t("successfullyLoggedOut"),
        style: { backgroundColor: "#fff", color: "#222" }
      });
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({
        variant: 'destructive',
        title: t("logoutFailed"),
        description: t("unexpectedLogoutError"),
        style: { backgroundColor: "#fff", color: "#222" }
      });
    }
  };

  const navItems = profile?.role === 'teacher' ? teacherNavItems : studentNavItems;

  return (
    <div className="flex flex-col h-full justify-between">
      <SidebarMenu>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith(item.href)}
              tooltip={t(item.label)}
            >
              <Link href={item.href}>
                <item.icon />
                <span>{t(item.label)}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>

      <SidebarMenu>
        <SidebarMenuItem>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <Select
                  value={LANGUAGE_OPTIONS.find((o) => i18n.language.startsWith(o.value))?.value ?? "en"}
                  onValueChange={(v) => i18n.changeLanguage(v)}
                >
                  <SelectTrigger
                    className="h-8 w-full gap-2 rounded-md border-0 bg-transparent p-2 shadow-none text-sidebar-foreground focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0"
                    aria-label={t("selectLanguage")}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <Languages className="size-4 shrink-0 text-sidebar-foreground" />
                      <SelectValue placeholder={t("selectLanguage")} />
                    </span>
                  </SelectTrigger>
                  <SelectContent
                    className="min-w-[10rem] bg-popover text-popover-foreground border border-border"
                    position="popper"
                    sideOffset={4}
                  >
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="cursor-pointer text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              align="center"
              hidden={state !== "collapsed" || isMobile}
            >
              {t("selectLanguage")}
            </TooltipContent>
          </Tooltip>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip={t("profile")} isActive={pathname === '/profile'}>
            <Link href="/profile">
              <User />
              <span className="truncate">{user?.email ?? t("profile")}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={handleLogout} tooltip={t("logout")}>
            <LogOut />
            <span>{t("Log Out")}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}
