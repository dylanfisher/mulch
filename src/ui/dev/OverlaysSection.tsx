/** @role Gallery section: dialog, popover, tooltip and toast. */
import { Button } from "@/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/components/dialog";
import { Field, FieldLabel } from "@/ui/components/field";
import { Input } from "@/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/ui/components/popover";
import { toast } from "@/ui/components/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/tooltip";
import { Specimen } from "@/ui/dev/Specimen";

/**
 * The toast viewport is the shell's, not the gallery's — one provider, above the route branch in
 * src/ui/App.tsx — so this specimen only sends, the way every other caller of it does.
 */
const sendToast = () => {
  toast.add({ title: "Event Log Exported", description: "128 events" });
};

export function OverlaysSection() {
  return (
    <>
      <Specimen name="Dialog">
        <Dialog>
          <DialogTrigger render={<Button variant="outline">Rename session</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename session</DialogTitle>
              <DialogDescription>The name shown in the session browser.</DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="rename">Name</FieldLabel>
              <Input id="rename" defaultValue="untitled" />
            </Field>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost">Cancel</Button>} />
              <DialogClose render={<Button>Save</Button>} />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Specimen>

      <Specimen name="Popover">
        <Popover>
          <PopoverTrigger render={<Button variant="outline">Delay detail</Button>} />
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>Delay</PopoverTitle>
              <PopoverDescription>Feedback above 100% self-oscillates.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      </Specimen>

      <Specimen name="Tooltip">
        <Tooltip>
          <TooltipTrigger render={<Button variant="secondary">Crop to loop</Button>} />
          <TooltipContent>Trims the clip to the loop region</TooltipContent>
        </Tooltip>
      </Specimen>

      <Specimen name="Toast">
        <Button variant="outline" onClick={sendToast}>
          Say A Thing Finished
        </Button>
      </Specimen>
    </>
  );
}
