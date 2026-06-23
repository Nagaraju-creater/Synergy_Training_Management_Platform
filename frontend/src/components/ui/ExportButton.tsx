import { Download, FileSpreadsheet, FileText, Share2 } from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu"

interface ExportButtonProps {
  onExport: (format: "csv" | "xlsx" | "pdf") => void;
  isLoading?: boolean;
}

export function ExportButton({ onExport, isLoading }: ExportButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={isLoading}>
          <Download size={14} />
          <span>Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Choose Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onExport("csv")} className="gap-2">
          <FileText size={14} className="text-muted-foreground" />
          <span>CSV (.csv)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("xlsx")} className="gap-2">
          <FileSpreadsheet size={14} className="text-muted-foreground" />
          <span>Excel (.xlsx)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("pdf")} className="gap-2">
          <Share2 size={14} className="text-muted-foreground" />
          <span>PDF Report (.pdf)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
