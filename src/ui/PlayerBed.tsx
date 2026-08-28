/**
 * @role One yard's ground: the Every dial, and behind the marker at its corner the three amounts
 *   saying how far one bed move travels, which way it leans and how often it comes home to the
 *   song's own bed instead (0183). Four fields of one `deck.player` spec, patched by the card that
 *   owns the command — the song's own, so no selection reaches them and none of them wears a mark
 *   (0184, the way the arrangement's four are drawn).
 * @instead The Bed dial those three are measured from, which stands on the box's own row because
 *   it is a place and not an amount of the move → src/ui/PlayerCard.tsx, which draws this box beside
 *   the arrangement's rather than among the three a part carries. What a bed becomes in
 *   sound — which loop-length of the source a landing reads in → src/audio/player.ts. What the
 *   three shape, and the move itself → src/lib/playerWalk.ts. The door they sit behind →
 *   src/ui/PlayerMore.tsx. What range each dial is drawn on → src/lib/playerKnobs.ts.
 */
import { PLAYER_BED_KNOBS } from "@/lib/playerKnobs";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerMore, type PlayerDoorProps } from "@/ui/PlayerMore";

export function PlayerBed({
  deck,
  named,
  player,
  defaults,
  patch,
  doors,
  voice,
  selected = false,
  disabled = false,
}: PlayerDoorProps) {
  return (
    <PlayerMore
      deck={deck}
      named={named}
      doors={doors}
      disabled={disabled}
      title={PLAYER_KNOB_LABELS.bedEvery}
      dial={
        <PlayerDial
          named={named}
          knob="bedEvery"
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
          selected={selected}
          disabled={disabled}
        />
      }
    >
      {PLAYER_BED_KNOBS.map((knob) => (
        <PlayerDial
          named={named}
          key={knob}
          knob={knob}
          player={player}
          defaults={defaults}
          patch={patch}
          {...voiceProps(voice)}
          selected={selected}
          disabled={disabled}
        />
      ))}
    </PlayerMore>
  );
}
