/** @role Gallery section: the menubar the shell's header is built from, and the dropdown menu underneath it. */
import { YARD } from "@/lib/copy";
import { Button } from "@/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/components/dropdown-menu";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/ui/components/menubar";
import { Specimen } from "@/ui/dev/Specimen";

export function MenusSection() {
  return (
    <>
      <Specimen name="Menubar">
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Primitives</MenubarItem>
              <MenubarSeparator />
              <MenubarCheckboxItem checked>Debug Console</MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Open Session…</MenubarItem>
              <MenubarItem>Export Event Log</MenubarItem>
              <MenubarItem variant="destructive">Discard</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </Specimen>

      <Specimen name="Dropdown menu">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline">{YARD} Actions</Button>} />
          <DropdownMenuContent>
            <DropdownMenuItem>Crop to loop</DropdownMenuItem>
            <DropdownMenuItem>Export WAV</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Specimen>
    </>
  );
}
