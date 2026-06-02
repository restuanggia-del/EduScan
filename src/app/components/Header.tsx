import { Search, Bell, User } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-border px-6 flex items-center justify-between">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari siswa, kelas, atau data lainnya..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="text-right">
            <div className="text-sm font-medium">Admin</div>
            <div className="text-xs text-muted-foreground">Super Admin</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
