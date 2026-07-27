// ─────────────────────────────────────────────────────────────
// Pose Assistant — pose reference library
//
// The library is entirely image-based: either a bundled default
// (shipped with the app, in public/pose-refs/, added below) or a
// custom photo a user uploaded themselves through the Pose Assistant
// modal (stored server-side via the /poses API — see PoseLibraryModal
// and api.js). There's no procedural stick-figure generation — every
// pose the user picks is a real reference image.
//
// Shot types are four fixed headcounts — no free-form "how many
// people" picker, since a reference image is for an exact number of
// people, not a generated layout that can stretch to fit any group
// size.
// ─────────────────────────────────────────────────────────────

export const POSE_TYPES = [
  { id: "single", label: "Single", emoji: "🧍",              description: "Just you" },
  { id: "duo",    label: "Duo",    emoji: "🧑‍🤝‍🧑",           description: "Two people" },
  { id: "trio",   label: "Trio",   emoji: "👯",               description: "Three people" },
  { id: "quad",   label: "Quad",   emoji: "👨‍👩‍👧‍👦",          description: "Four people" },
]

// ── Default reference-image poses ────────────────────────────
//
// Bundled actual illustrated poses (shipped with the app, in
// public/pose-refs/) that show up in every user's Pose Assistant
// library automatically — no upload needed. This is separate from
// the per-user custom uploads (backend PoseReference model), which
// only that account sees.
//
//   { id: "default-xyz", kind: "default", type: "single" | "duo" | "trio" | "quad",
//     label: "Display name", tip: "Short instruction", src: "/pose-refs/xyz.png" }
export const DEFAULT_POSE_IMAGES = [
  // ── Single ──────────────────────────────────────────────
  { id: "default-solo-hand-on-hip", kind: "default", type: "single",
    label: "Hand on Hip", tip: "Stand with one hand on your hip, confident smile",
    src: "/pose-refs/solo-hand-on-hip.png" },
  { id: "default-solo-peace-sign", kind: "default", type: "single",
    label: "Peace Sign", tip: "Flash a peace sign near your face",
    src: "/pose-refs/solo-peace-sign.png" },
  { id: "default-solo-over-shoulder-look", kind: "default", type: "single",
    label: "Over the Shoulder Look", tip: "Glance back over your shoulder",
    src: "/pose-refs/solo-over-shoulder-look.png" },
  { id: "default-solo-twirling-skirt", kind: "default", type: "single",
    label: "Twirling Skirt", tip: "Mid-twirl with your outfit flaring out",
    src: "/pose-refs/solo-twirling-skirt.png" },
  { id: "default-solo-blowing-kiss", kind: "default", type: "single",
    label: "Blowing a Kiss", tip: "Hand near your lips, blowing a kiss to the camera",
    src: "/pose-refs/solo-blowing-kiss.png" },
  { id: "default-solo-adjusting-hair", kind: "default", type: "single",
    label: "Adjusting Hair", tip: "Tuck a strand of hair behind your ear",
    src: "/pose-refs/solo-adjusting-hair.png" },
  { id: "default-solo-sitting-cross-legged", kind: "default", type: "single",
    label: "Sitting Cross-Legged", tip: "Sit on the floor in a relaxed pose",
    src: "/pose-refs/solo-sitting-cross-legged.png" },
  { id: "default-solo-jumping-shot", kind: "default", type: "single",
    label: "Jumping Shot", tip: "Mid-air jump, arms and legs spread",
    src: "/pose-refs/solo-jumping-shot.png" },
  { id: "default-solo-candid-laugh", kind: "default", type: "single",
    label: "Candid Laugh", tip: "Caught mid-laugh, looking away from the camera",
    src: "/pose-refs/solo-candid-laugh.png" },
  { id: "default-solo-looking-at-phone", kind: "default", type: "single",
    label: "Looking at Phone", tip: "Glance down at your phone with a soft smile",
    src: "/pose-refs/solo-looking-at-phone.png" },
  { id: "default-solo-selfie-angle", kind: "default", type: "single",
    label: "Selfie Angle", tip: "Hold your phone up for a selfie",
    src: "/pose-refs/solo-selfie-angle.png" },
  { id: "default-solo-winking", kind: "default", type: "single",
    label: "Winking", tip: "Playful wink toward the camera",
    src: "/pose-refs/solo-winking.png" },
  { id: "default-solo-hand-near-face", kind: "default", type: "single",
    label: "Hand Near Face", tip: "Rest your chin or cheek on your hand",
    src: "/pose-refs/solo-hand-near-face.png" },
  { id: "default-solo-walking-shot", kind: "default", type: "single",
    label: "Walking Shot", tip: "Mid-stride, looking back at the camera",
    src: "/pose-refs/solo-walking-shot.png" },
  { id: "default-solo-leaning-on-wall", kind: "default", type: "single",
    label: "Leaning on Wall", tip: "Lean casually against a wall",
    src: "/pose-refs/solo-leaning-on-wall.png" },
  { id: "default-solo-hands-in-pockets", kind: "default", type: "single",
    label: "Hands in Pockets", tip: "Relaxed stance with hands tucked in your pockets",
    src: "/pose-refs/solo-hands-in-pockets.png" },
  { id: "default-solo-playing-necklace", kind: "default", type: "single",
    label: "Playing with Necklace", tip: "Fingers lightly touching a necklace",
    src: "/pose-refs/solo-playing-necklace.png" },
  { id: "default-solo-looking-back", kind: "default", type: "single",
    label: "Looking Back", tip: "Turned away, glancing back over one shoulder",
    src: "/pose-refs/solo-looking-back.png" },
  { id: "default-solo-sitting-on-steps", kind: "default", type: "single",
    label: "Sitting on Steps", tip: "Seated on steps, chin resting on your knees",
    src: "/pose-refs/solo-sitting-on-steps.png" },
  { id: "default-solo-twirl-spin", kind: "default", type: "single",
    label: "Twirl Spin", tip: "Caught mid-spin, hair and outfit in motion",
    src: "/pose-refs/solo-twirl-spin.png" },

  // ── Duo ─────────────────────────────────────────────────
  { id: "default-duo-side-hug-smile", kind: "default", type: "duo",
    label: "Side Hug Smile", tip: "Stand side by side with an arm around each other, smiling",
    src: "/pose-refs/duo-side-hug-smile.png" },
  { id: "default-duo-back-hug", kind: "default", type: "duo",
    label: "Back Hug", tip: "One hugs the other from behind",
    src: "/pose-refs/duo-back-hug.png" },
  { id: "default-duo-emotional-hug", kind: "default", type: "duo",
    label: "Emotional Hug", tip: "A warm, close two-person hug",
    src: "/pose-refs/duo-emotional-hug.png" },
  { id: "default-duo-head-rest", kind: "default", type: "duo",
    label: "Head Rest", tip: "One resting her head on the other's shoulder",
    src: "/pose-refs/duo-head-rest.png" },
  { id: "default-duo-leaning-laugh", kind: "default", type: "duo",
    label: "Leaning Laugh", tip: "Leaning into each other laughing",
    src: "/pose-refs/duo-leaning-laugh.png" },
  { id: "default-duo-playful-pull", kind: "default", type: "duo",
    label: "Playful Pull", tip: "One playfully pulling the other closer",
    src: "/pose-refs/duo-playful-pull.png" },
  { id: "default-duo-facing-laugh", kind: "default", type: "duo",
    label: "Facing Laugh", tip: "Facing each other, laughing",
    src: "/pose-refs/duo-facing-laugh.png" },
  { id: "default-duo-teasing-poke", kind: "default", type: "duo",
    label: "Teasing Poke", tip: "One poking the other's cheek, both laughing",
    src: "/pose-refs/duo-teasing-poke.png" },
  { id: "default-duo-holding-hands-spin", kind: "default", type: "duo",
    label: "Holding Hands Spin", tip: "Holding hands, mid-spin",
    src: "/pose-refs/duo-holding-hands-spin.png" },
  { id: "default-duo-forward-pull", kind: "default", type: "duo",
    label: "Forward Pull", tip: "One pulling the other forward by the hand",
    src: "/pose-refs/duo-forward-pull.png" },
  { id: "default-duo-fun-jump", kind: "default", type: "duo",
    label: "Fun Jump", tip: "Both jumping together",
    src: "/pose-refs/duo-fun-jump.png" },
  { id: "default-duo-eye-cover", kind: "default", type: "duo",
    label: "Eye Cover", tip: "One covering the other's eyes from behind",
    src: "/pose-refs/duo-eye-cover.png" },
  { id: "default-duo-close-selfie", kind: "default", type: "duo",
    label: "Close Selfie", tip: "Leaning in close together for a selfie",
    src: "/pose-refs/duo-close-selfie.png" },
  { id: "default-duo-phone-laugh", kind: "default", type: "duo",
    label: "Phone Laugh", tip: "Both laughing at something on a phone",
    src: "/pose-refs/duo-phone-laugh.png" },
  { id: "default-duo-mirror-pose", kind: "default", type: "duo",
    label: "Mirror Pose", tip: "Posing together in a mirror selfie",
    src: "/pose-refs/duo-mirror-pose.png" },
  { id: "default-duo-group-mirror-pose", kind: "default", type: "duo",
    label: "Group Mirror Pose", tip: "A wider mirror shot with both fully visible",
    src: "/pose-refs/duo-group-mirror-pose.png" },
  { id: "default-duo-adjusting-pose", kind: "default", type: "duo",
    label: "Adjusting Pose", tip: "One adjusting the other's hair",
    src: "/pose-refs/duo-adjusting-pose.png" },
  { id: "default-duo-photo-check", kind: "default", type: "duo",
    label: "Photo Check", tip: "Both looking at a phone reviewing a photo",
    src: "/pose-refs/duo-photo-check.png" },
  { id: "default-duo-selfie-peace", kind: "default", type: "duo",
    label: "Selfie Peace", tip: "Both flashing peace signs for a selfie",
    src: "/pose-refs/duo-selfie-peace.png" },
  { id: "default-duo-whispering-secret", kind: "default", type: "duo",
    label: "Whispering Secret", tip: "One whispering into the other's ear",
    src: "/pose-refs/duo-whispering-secret.png" },

  // ── Trio ────────────────────────────────────────────────
  // Only one clean 3-person pose came out of the generated set so far —
  // the rest were miscounted (2 or 4 people). Add more here as you
  // generate/upload additional trio images.
  { id: "default-trio-back-hug", kind: "default", type: "trio",
    label: "Back Hug", tip: "One hugs the other two from behind",
    src: "/pose-refs/trio-back-hug.png" },

  // ── Quad ────────────────────────────────────────────────
  { id: "default-quad-classic-lineup", kind: "default", type: "quad",
    label: "Classic Lineup", tip: "All four standing side by side, arms linked",
    src: "/pose-refs/quad-classic-lineup.png" },
  { id: "default-quad-group-jump", kind: "default", type: "quad",
    label: "Group Jump", tip: "All four jumping together in mid-air",
    src: "/pose-refs/quad-group-jump.png" },
  { id: "default-quad-staggered-pyramid", kind: "default", type: "quad",
    label: "Staggered Pyramid", tip: "Two crouching in front, two standing behind",
    src: "/pose-refs/quad-staggered-pyramid.png" },
  { id: "default-quad-arm-chain", kind: "default", type: "quad",
    label: "Arm Chain", tip: "Each with an arm around the next one's shoulder, in a row",
    src: "/pose-refs/quad-arm-chain.png" },
  { id: "default-quad-walking-row", kind: "default", type: "quad",
    label: "Walking Row", tip: "All four walking side by side toward the camera",
    src: "/pose-refs/quad-walking-row.png" },
  { id: "default-quad-high-five-pile", kind: "default", type: "quad",
    label: "High Five Pile", tip: "All four hands stacked together in one high five",
    src: "/pose-refs/quad-high-five-pile.png" },
  { id: "default-quad-train-formation", kind: "default", type: "quad",
    label: "Train Formation", tip: "Each with hands on the shoulders of the one in front",
    src: "/pose-refs/quad-train-formation.png" },
  { id: "default-quad-group-twirl", kind: "default", type: "quad",
    label: "Group Twirl", tip: "All four spinning together, hair and skirts in motion",
    src: "/pose-refs/quad-group-twirl.png" },
  { id: "default-quad-diamond-formation", kind: "default", type: "quad",
    label: "Diamond Formation", tip: "One in front, two on the sides, one in back",
    src: "/pose-refs/quad-diamond-formation.png" },
  { id: "default-quad-piggyback-pair", kind: "default", type: "quad",
    label: "Piggyback Pair", tip: "Two pairs, each giving the other a piggyback",
    src: "/pose-refs/quad-piggyback-pair.png" },
]

export function getDefaultPoseImages(type) {
  return DEFAULT_POSE_IMAGES.filter((p) => p.type === type)
}
