/** @role Gallery section: the menubar the shell's header is built from, and the dropdown menu underneath it. */
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
            <MenubarTrigger>view</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>primitives</MenubarItem>
              <MenubarItem>event log</MenubarItem>
              <MenubarSeparator />
              <MenubarCheckboxItem checked>debug console</MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>session</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>save</MenubarItem>
              <MenubarItem variant="destructive">discard</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </Specimen>

      <Specimen name="Dropdown menu">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline">Deck actions</Button>} />
          <DropdownMenuContent>
            <DropdownMenuItem>Crop to loop</DropdownMenuItem>
            <DropdownMenuItem>Export WAV</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Specimen>
    </>
  );
}
