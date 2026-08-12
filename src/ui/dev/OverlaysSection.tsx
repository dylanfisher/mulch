/** @role Gallery section: dialog, popover and tooltip. */
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/tooltip";
import { Specimen } from "@/ui/dev/Specimen";

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
    </>
  );
}
