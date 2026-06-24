import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function SettingsDeleteDialog({
  open,
  onOpenChange,
  deleteConfirmText,
  setDeleteConfirmText,
  deleting,
  onDelete,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription className="space-y-2 pt-1">
            <span className="block">
              This will permanently delete your account, profile, bookings, and all associated data.
              <strong> This cannot be undone.</strong>
            </span>
            <span className="block">
              Make sure you have settled any outstanding payments or active bookings before proceeding.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="delete-confirm" className="text-sm">
            Type <strong>DELETE</strong> to confirm
          </Label>
          <Input
            id="delete-confirm"
            placeholder="DELETE"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            aria-label="Cancel account deletion"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={deleteConfirmText !== "DELETE" || deleting}
            aria-label={deleting ? "Deleting account" : "Permanently delete account"}
          >
            {deleting ? "Deleting…" : "Permanently Delete Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}