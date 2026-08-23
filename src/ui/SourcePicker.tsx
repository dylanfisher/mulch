/**
 * @role What a yard is playing and how to change it, as one control: the generators it can draw
 *   from and the file it can read, in one menu with the loaded one named on the trigger (P70,
 *   P98). Picking a generator sends the ordinary `deck.load` its caller builds; picking the
 *   import opens the one file field, which is this control's own and stays in the tree so the
 *   yard's header carries the whole of its source.
 * @instead What the generators are → GEN_KINDS in src/lib/waveform.ts, the one list this renders.
 *   The length and the pitch that load travels with → src/ui/LoadField.tsx. What an import does
 *   with the file → `importDeckFile` in src/ui/Deck.tsx.
 */
import { type ChangeEvent, useCallback, useRef } from "react";

import { AUDIO_FILE_ACCEPT } from "@/lib/audioFile";
import { GENERATOR_LABEL, IMPORT_AUDIO, SOURCE_LABEL, yardLabel } from "@/lib/copy";
import { GEN_KINDS, type GenKind } from "@/lib/waveform";
import type { DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/components/dropdown-menu";
import { INSTANT_POPUP } from "@/ui/shell";

/** The items depend on nothing, so they are built once rather than on every render. */
const SOURCE_ITEMS = GEN_KINDS.map((kind) => (
  <DropdownMenuRadioItem key={kind} value={kind}>
    {kind}
  </DropdownMenuRadioItem>
));

// One handler per route into this control — pick a generator, open the field, take the file — and
// the menu those routes are drawn as. The length is how many ways a yard's source can be set, not
// how much this component decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function SourcePicker({
  deck,
  current,
  fileName,
  onPick,
  onImport,
}: {
  deck: DeckId;
  /** The generator loaded, or null for nothing and for an imported blob — no entry is checked. */
  current: GenKind | null;
  /**
   * The name of the file this yard's bytes arrived as, or null for everything that has none: a
   * generator, bytes a crop or a flatten minted, and a yard holding nothing. Read off the id the
   * bytes are stored under (0127), so this is a second reader of that name and not a second fact.
   */
  fileName: string | null;
  onPick: (kind: GenKind) => void;
  onImport: (file: File) => void;
}) {
  const field = useRef<HTMLInputElement>(null);
  const onValueChange = useCallback(
    (value: unknown) => {
      // The menu hands back its own item's value, so a kind that is not one of ours is a value
      // nothing rendered — refused rather than loaded, which is what makes the list the one list.
      const kind = GEN_KINDS.find((k) => k === value);
      if (kind === undefined) return;
      onPick(kind);
    },
    [onPick],
  );
  // The entry opens the field beside it rather than being one: a file field is the browser's own
  // control and cannot be drawn as a menu item, so the item presses it (P98).
  const browse = useCallback(() => {
    field.current?.click();
  }, []);
  const onFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.item(0);
      if (file === null || file === undefined) return;
      onImport(file);
      // Cleared, so importing the same file twice in a row is two changes rather than one.
      event.currentTarget.value = "";
    },
    [onImport],
  );

  return (
    <>
      <DropdownMenu>
        {/* The trigger says what this yard is playing — the generator's own kind, or the name of
            the file its bytes came in as, which is the one thing a person recognises their audio
            by. A name is as long as it is, so it is muted, held to the control's width and cut
            with an ellipsis rather than allowed to wrap the header (P98). */}
        <DropdownMenuTrigger
          render={
            <Button
              size="sm"
              variant="outline"
              className="max-w-52 min-w-24 shrink justify-start"
              aria-label={`${yardLabel(deck)} ${SOURCE_LABEL}`}
            >
              {/* One line, however long the name is: the trigger gives up width before the
                  yard's own buttons do, so a header on a narrow shell never pushes the page
                  sideways (P46). */}
              <span
                className={
                  current === null && fileName !== null
                    ? "min-w-0 truncate text-muted-foreground"
                    : "min-w-0 truncate"
                }
              >
                {current ?? fileName ?? SOURCE_LABEL}
              </span>
            </Button>
          }
        />
        {/* Opens instantly, like every other popup whose entries are pressed rather than read:
          waiting out an enter and an exit animation is what costs the gate (0056). */}
        <DropdownMenuContent align="start" className={`w-52 ${INSTANT_POPUP}`}>
          {/* The generators are a choice of one among them; the import is not one of them, so it
              stands under its own rule rather than as a sixth radio entry that nothing checks.
              The heading over them belongs to their group and is written inside it: a menu label
              with no group around it throws on the first open, which is a menu that never opens
              at all. */}
          <DropdownMenuRadioGroup value={current ?? ""} onValueChange={onValueChange}>
            <DropdownMenuLabel>{GENERATOR_LABEL}</DropdownMenuLabel>
            {SOURCE_ITEMS}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={browse}>{IMPORT_AUDIO}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Rendered whether the menu is open or not, and reachable by name: it is the field an
          agent sets files on, so it may not live inside a popup that exists only while it is
          open. Off the screen rather than hidden, because a hidden field takes no focus
          (scripts/smoke.d/keyboard.js). Out of the tab order for the reason the session
          archive's field is (src/ui/FileMenu.tsx): the menu entry above is how a keyboard
          reaches it, and an invisible stop in a yard's header is one nothing announces. */}
      <input
        ref={field}
        tabIndex={-1}
        className="sr-only"
        type="file"
        accept={AUDIO_FILE_ACCEPT}
        aria-label={`${IMPORT_AUDIO} for ${yardLabel(deck)}`}
        onChange={onFile}
      />
    </>
  );
}
