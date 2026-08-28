/**
 * @role The instrument's icon vocabulary: one icon per action, decided once here and imported
 *   wherever that action is offered, so play means the same picture on a deck, in the rack and in
 *   the menubar. Icons come per icon rather than through the barrel, so a screen pulls only the
 *   ones it draws.
 * @instead Anything that is not an action — an effect, a theme — carries its icon beside its own
 *   identity, never as a second map from ids to pictures here.
 */

// One import per action this file names, which is the entire point of it: the count tracks how
// many actions the instrument offers, not how much this file decides, and the per-icon paths are
// what keep a screen from pulling the barrel.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies

import { ArrowLineRightIcon } from "@phosphor-icons/react/ArrowLineRight";
import { ArrowUUpLeftIcon } from "@phosphor-icons/react/ArrowUUpLeft";
import { ArrowUUpRightIcon } from "@phosphor-icons/react/ArrowUUpRight";
import { CameraIcon } from "@phosphor-icons/react/Camera";
import { CaretUpIcon } from "@phosphor-icons/react/CaretUp";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { CropIcon } from "@phosphor-icons/react/Crop";
import { DotsSixVerticalIcon } from "@phosphor-icons/react/DotsSixVertical";
import { DownloadSimpleIcon } from "@phosphor-icons/react/DownloadSimple";
import { FileTextIcon } from "@phosphor-icons/react/FileText";
import { HeadphonesIcon } from "@phosphor-icons/react/Headphones";
import { MagicWandIcon } from "@phosphor-icons/react/MagicWand";
import { MagnetIcon } from "@phosphor-icons/react/Magnet";
import { MapPinIcon } from "@phosphor-icons/react/MapPin";
import { PauseIcon } from "@phosphor-icons/react/Pause";
import { PencilSimpleIcon } from "@phosphor-icons/react/PencilSimple";
import { PlantIcon } from "@phosphor-icons/react/Plant";
import { PlayIcon } from "@phosphor-icons/react/Play";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { ProhibitIcon } from "@phosphor-icons/react/Prohibit";
import { RepeatIcon } from "@phosphor-icons/react/Repeat";
import { ShuffleIcon } from "@phosphor-icons/react/Shuffle";
import { StackSimpleIcon } from "@phosphor-icons/react/StackSimple";
import { StopIcon } from "@phosphor-icons/react/Stop";
import { TerminalWindowIcon } from "@phosphor-icons/react/TerminalWindow";
import { TrashIcon } from "@phosphor-icons/react/Trash";
import { UploadSimpleIcon } from "@phosphor-icons/react/UploadSimple";
import { WaveformIcon } from "@phosphor-icons/react/Waveform";
// oxlint-enable import/max-dependencies

/**
 * Keyed by what the control does, not by where it sits: `remove` is the same picture on a deck,
 * a clip and a rack instance because those are one action a person learns once. A key that would
 * only ever have one call site still belongs here — the point is that the next surface offering
 * that action finds the answer rather than choosing again.
 */
export const ACTION_ICONS = {
  play: PlayIcon,
  pause: PauseIcon,
  stop: StopIcon,
  loop: RepeatIcon,
  crop: CropIcon,
  // The thing growing where it was put: a plant takes the ground the pattern wandered onto and
  // makes it the loop, which is a placing and not a second crop.
  plant: PlantIcon,
  // A stack of layers pressed into one: a flatten keeps the sound the rack made, so the picture
  // is the several becoming the single and not a second crop (0112).
  flatten: StackSimpleIcon,
  snap: MagnetIcon,
  // One grip, not two arrows: reordering is a drag of the card, and the arrow keys on that
  // same grip are its keyboard path (0062).
  reorder: DotsSixVerticalIcon,
  add: PlusIcon,
  remove: TrashIcon,
  // Naming a thing that is already named: the name itself reads as text wherever it is shown, and
  // the pencil is the one control that opens the field to change it.
  rename: PencilSimpleIcon,
  // The barred circle, which is the one picture that says "still here, not taken": a bin ends a
  // thing and this passes over one. Not a crossed-out eye either — what a skip changes is what is
  // played, never what is shown (0055).
  skip: ProhibitIcon,
  // Headphones and not the transport's own triangle: what this plays is one thing on its own,
  // where every play button in the instrument starts a whole yard. Two actions, two pictures, so a
  // hand can tell them apart on one row (0055).
  audition: HeadphonesIcon,
  capture: CameraIcon,
  // One yard becoming two. Not the capture camera: capturing takes a picture of a yard to keep,
  // duplicating puts a second one on the screen (0078).
  duplicate: CopyIcon,
  // One picture for the fold, not two: the toggle reports which way it is pointing through
  // `aria-pressed`, and the caret turns with it (0055).
  collapse: CaretUpIcon,
  // Drawing a new seed, which is not copying anything: the copy icon said a second one was being
  // made, and what happens is that one pattern becomes a different pattern (0089, P74).
  reseed: ShuffleIcon,
  // Not the shuffle beside it: reseed keeps every setting and draws a different performance of
  // them, and this draws the settings themselves. Two pictures, because they stand next to each
  // other in one corner and a hand has to tell them apart before pressing either (0055, 0152).
  character: MagicWandIcon,
  apply: ArrowLineRightIcon,
  // Going to a yard is arriving somewhere, not applying something to it: the palette says so with
  // a pin, and `apply`'s arrow stays the one picture for a clip landing on a yard (0055).
  goTo: MapPinIcon,
  debugConsole: TerminalWindowIcon,
  undo: ArrowUUpLeftIcon,
  redo: ArrowUUpRightIcon,
  exportSession: DownloadSimpleIcon,
  exportLog: FileTextIcon,
  // Not the session's download arrow: what leaves here is the sound, and the two entries sit one
  // above the other in the same menu, where one picture twice says they do the same thing.
  exportAudio: WaveformIcon,
  openSession: UploadSimpleIcon,
} as const satisfies Record<string, typeof PlayIcon>;
