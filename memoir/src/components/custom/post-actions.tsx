import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

export function PostActions({
  onPost,
  onSaveDraft,
  onSchedule,
}: {
  onPost?: () => void
  onSaveDraft?: () => void
  onSchedule?: () => void
}) {
  return (
    <div className="flex">
      <Button variant="default" onClick={onSaveDraft} className="rounded-r-none">
        Save
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="default" className="rounded-l-none px-2">
            <ChevronDown  />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onPost}>Post Now</DropdownMenuItem>
          <DropdownMenuItem onClick={onSaveDraft}>Save as Draft</DropdownMenuItem>
          <DropdownMenuItem onClick={onSchedule}>Schedule…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
