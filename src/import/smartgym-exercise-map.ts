// Curated SmartGym → Hevy exercise mapping.
//
// Every distinct backup exercise name (that carries set data) maps to an exact Hevy
// exercise template id. Built by seeding with the fuzzy matcher's suggestions, then
// hand-correcting every wrong/missing match and creating custom templates where Hevy
// has no faithful built-in. Reviewed and approved before any workout was imported.
//
// The importer resolves each raw name via EXACT lookup here — never via live fuzzy
// matching (which produced dangerous wrong matches, e.g. "Cross Body Crunch" →
// "Cross Body Hammer Curl"). A raw name absent from this table is a hard error.

export interface MapEntry {
  /** Hevy exercise template id — an existing built-in, or a custom one we created. */
  hevyTemplateId: string;
  /** Hevy template title, for readability and preview output. */
  hevyTitle: string;
  /** Movement class — drives set shape (lift → weight/reps, stretch/mobility → duration). */
  kind: "lift" | "stretch" | "mobility";
  /** True if we created this template during import setup (not a Hevy built-in). */
  custom?: boolean;
}

export const SMARTGYM_EXERCISE_MAP: Record<string, MapEntry> = {
  // ===================================================================
  // Existing Hevy built-ins (clean matches + hand-corrected matches)
  // ===================================================================

  // --- chest / press ---
  "Bench Press": { hevyTemplateId: "79D0BB3A", hevyTitle: "Bench Press (Barbell)", kind: "lift" },
  "Bench Press with Dumbbell": { hevyTemplateId: "3601968B", hevyTitle: "Bench Press (Dumbbell)", kind: "lift" },
  "Bench Press Machine (Chest Press)": { hevyTemplateId: "7EB3F7C3", hevyTitle: "Chest Press (Machine)", kind: "lift" },
  "Incline Bench Press": { hevyTemplateId: "50DFDFAB", hevyTitle: "Incline Bench Press (Barbell)", kind: "lift" },
  "Incline Bench Press with Dumbbell": { hevyTemplateId: "07B38369", hevyTitle: "Incline Bench Press (Dumbbell)", kind: "lift" },
  "Incline Bench Press Machine (Chest Press)": { hevyTemplateId: "FBF92739", hevyTitle: "Incline Chest Press (Machine)", kind: "lift" },
  "Incline Dumbbell Fly": { hevyTemplateId: "D3E2AB55", hevyTitle: "Incline Chest Fly (Dumbbell)", kind: "lift" },
  "Dumbbell Fly": { hevyTemplateId: "12017185", hevyTitle: "Chest Fly (Dumbbell)", kind: "lift" },
  "Butterfly": { hevyTemplateId: "9DCE2D64", hevyTitle: "Butterfly (Pec Deck)", kind: "lift" },
  "Standing Cable Fly": { hevyTemplateId: "651F844C", hevyTitle: "Cable Fly Crossovers", kind: "lift" },
  "Pullover with Dumbbell": { hevyTemplateId: "67280085", hevyTitle: "Pullover (Dumbbell)", kind: "lift" },

  // --- legs ---
  "Squat with Barbell": { hevyTemplateId: "D04AC939", hevyTitle: "Squat (Barbell)", kind: "lift" },
  "Squat with Dumbbell": { hevyTemplateId: "DCFF3E9F", hevyTitle: "Squat (Dumbbell)", kind: "lift" },
  "Squat": { hevyTemplateId: "9694DA61", hevyTitle: "Squat (Bodyweight)", kind: "lift" },
  "Hack Squat": { hevyTemplateId: "AC5A4C58", hevyTitle: "Hack Squat", kind: "lift" },
  "Zercher Squat": { hevyTemplateId: "40C6A9FC", hevyTitle: "Zercher Squat", kind: "lift" },
  "Bulgarian Split Squat": { hevyTemplateId: "0F24286A", hevyTitle: "Bulgarian Split Squat (Barbell)", kind: "lift" },
  "Bulgarian Split Squat with Dumbbell": { hevyTemplateId: "B5D3A742", hevyTitle: "Bulgarian Split Squat (Dumbbell)", kind: "lift" },
  "Leg Press": { hevyTemplateId: "C7973E0E", hevyTitle: "Leg Press (Machine)", kind: "lift" },
  "Leg Extension Machine": { hevyTemplateId: "75A4F6C4", hevyTitle: "Leg Extension (Machine)", kind: "lift" },
  "Lying Leg Curl": { hevyTemplateId: "B8127AD1", hevyTitle: "Lying Leg Curl (Machine)", kind: "lift" },
  "Machine Seated Calf Raise": { hevyTemplateId: "062AB91A", hevyTitle: "Seated Calf Raise", kind: "lift" },
  "Machine Standing Calf Raise": { hevyTemplateId: "E05C2C38", hevyTitle: "Standing Calf Raise (Machine)", kind: "lift" },
  "Barbell Hip Thrust": { hevyTemplateId: "D57C2EC7", hevyTitle: "Hip Thrust (Barbell)", kind: "lift" },
  "Deadlift with Barbell": { hevyTemplateId: "C6272009", hevyTitle: "Deadlift (Barbell)", kind: "lift" },
  "Deadlift with Dumbbell": { hevyTemplateId: "5F4E6DD3", hevyTitle: "Deadlift (Dumbbell)", kind: "lift" },
  "Clean Deadlift": { hevyTemplateId: "ABB00838", hevyTitle: "Clean", kind: "lift" },
  "Romanian Deadlift with Barbell (Stiff Leg)": { hevyTemplateId: "2B4B7310", hevyTitle: "Romanian Deadlift (Barbell)", kind: "lift" },
  "Romanian Deadlift with Dumbbell (Stiff Leg)": { hevyTemplateId: "72CFFAD5", hevyTitle: "Romanian Deadlift (Dumbbell)", kind: "lift" },
  "Walking Lunges": { hevyTemplateId: "32HKJ34K", hevyTitle: "Walking Lunge", kind: "lift" },
  "Landmine 180": { hevyTemplateId: "923874CA", hevyTitle: "Landmine 180", kind: "lift" },

  // --- back / rows / pulls ---
  "Single Arm Row": { hevyTemplateId: "D0C4A899", hevyTitle: "Single Arm Cable Row", kind: "lift" },
  "Seated Cable Row with Narrow Grip": { hevyTemplateId: "F1D60854", hevyTitle: "Seated Cable Row - Bar Grip", kind: "lift" },
  "Cable Lat Pulldown": { hevyTemplateId: "6A6C31A5", hevyTitle: "Lat Pulldown (Cable)", kind: "lift" },
  "Cable Lat Pulldown with Reverse Grip": { hevyTemplateId: "046E25A2", hevyTitle: "Reverse Grip Lat Pulldown (Cable)", kind: "lift" },
  "Cable Lat Pulldown with Wide Grip": { hevyTemplateId: "6A6C31A5", hevyTitle: "Lat Pulldown (Cable)", kind: "lift" },
  "Cable Pulldown": { hevyTemplateId: "6A6C31A5", hevyTitle: "Lat Pulldown (Cable)", kind: "lift" },
  "Cable Face Pull with Rope": { hevyTemplateId: "BE640BA0", hevyTitle: "Face Pull", kind: "lift" },
  "Bent Over Row with Barbell Wide Grip": { hevyTemplateId: "55E6546F", hevyTitle: "Bent Over Row (Barbell)", kind: "lift" },
  "Bent Over Row with Dumbbell": { hevyTemplateId: "23E92538", hevyTitle: "Bent Over Row (Dumbbell)", kind: "lift" },
  "Bent Over Row with Dumbbell Reverse Grip": { hevyTemplateId: "23E92538", hevyTitle: "Bent Over Row (Dumbbell)", kind: "lift" },
  "Incline Row with Dumbbell": { hevyTemplateId: "914F3A96", hevyTitle: "Chest Supported Incline Row (Dumbbell)", kind: "lift" },
  "Incline Row with Barbell": { hevyTemplateId: "DF3BDB9C", hevyTitle: "Seal Row (Barbell)", kind: "lift" },
  "T-Bar Row": { hevyTemplateId: "D7D7FCCE", hevyTitle: "Landmine Row", kind: "lift" },
  "Upright Row with Dumbbell": { hevyTemplateId: "797F0782", hevyTitle: "Upright Row (Dumbbell)", kind: "lift" },
  "Upright Row with Dumbbell Narrow Grip": { hevyTemplateId: "797F0782", hevyTitle: "Upright Row (Dumbbell)", kind: "lift" },
  "Shrug with Dumbbell": { hevyTemplateId: "ABEC557F", hevyTitle: "Shrug (Dumbbell)", kind: "lift" },
  "Bodyweight Pull Up": { hevyTemplateId: "1B2B1E7C", hevyTitle: "Pull Up", kind: "lift" },

  // --- shoulders ---
  "Arnold Press": { hevyTemplateId: "A69FF221", hevyTitle: "Arnold Press (Dumbbell)", kind: "lift" },
  "Seated Shoulder Press with Dumbbell": { hevyTemplateId: "9237BAD1", hevyTitle: "Seated Shoulder Press (Machine)", kind: "lift" },
  "Shoulder Press with Dumbbell": { hevyTemplateId: "878CD1D0", hevyTitle: "Shoulder Press (Dumbbell)", kind: "lift" },
  "Overhead Press": { hevyTemplateId: "7B8D84E8", hevyTitle: "Overhead Press (Barbell)", kind: "lift" },
  "Standing Single Arm Cable Side Lateral Raise": { hevyTemplateId: "DE68C825", hevyTitle: "Single Arm Lateral Raise (Cable)", kind: "lift" },
  "Side Lateral Raise with Dumbbell": { hevyTemplateId: "422B08F1", hevyTitle: "Lateral Raise (Dumbbell)", kind: "lift" },
  "Alternate Front Raise with Dumbbell": { hevyTemplateId: "8293E554", hevyTitle: "Front Raise (Dumbbell)", kind: "lift" },
  "Single Arm Front Raise with Dumbbell": { hevyTemplateId: "8293E554", hevyTitle: "Front Raise (Dumbbell)", kind: "lift" },
  "Bent Over Reverse Fly with Dumbbell (Rear Delt)": { hevyTemplateId: "E5988A0A", hevyTitle: "Rear Delt Reverse Fly (Dumbbell)", kind: "lift" },
  "Bent Over Kettlebell Press": { hevyTemplateId: "6433CD93", hevyTitle: "Kettlebell Shoulder Press", kind: "lift" },

  // --- triceps ---
  "Cable Triceps Pushdown": { hevyTemplateId: "93A552C6", hevyTitle: "Triceps Pushdown", kind: "lift" },
  "Overhead Cable Triceps Extension": { hevyTemplateId: "B5EFBF9C", hevyTitle: "Overhead Triceps Extension (Cable)", kind: "lift" },
  "Triceps Extension with Barbell": { hevyTemplateId: "2F8D3067", hevyTitle: "Triceps Extension (Barbell)", kind: "lift" },
  "Triceps Extension with Dumbbell": { hevyTemplateId: "3765684D", hevyTitle: "Triceps Extension (Dumbbell)", kind: "lift" },
  "Seated Triceps Extension": { hevyTemplateId: "234BC743", hevyTitle: "Seated Triceps Press", kind: "lift" },
  "Triceps Kickback": { hevyTemplateId: "6127A3AD", hevyTitle: "Triceps Kickback (Dumbbell)", kind: "lift" },
  "Triceps Dips": { hevyTemplateId: "28BB4A95", hevyTitle: "Triceps Dip", kind: "lift" },
  "Bench Dips": { hevyTemplateId: "CD6DC8E5", hevyTitle: "Bench Dip", kind: "lift" },

  // --- biceps / forearms ---
  "Preacher Curl with EZ-Bar": { hevyTemplateId: "4F942934", hevyTitle: "Preacher Curl (Barbell)", kind: "lift" },
  "Preacher Curl with Dumbbell": { hevyTemplateId: "FAB6EB2F", hevyTitle: "Preacher Curl (Dumbbell)", kind: "lift" },
  "Biceps Curl with EZ-Bar": { hevyTemplateId: "01A35BF9", hevyTitle: "EZ Bar Biceps Curl", kind: "lift" },
  "Biceps Curl with Dumbbell": { hevyTemplateId: "37FCC2BB", hevyTitle: "Bicep Curl (Dumbbell)", kind: "lift" },
  "Biceps Curl with Barbell": { hevyTemplateId: "A5AC6449", hevyTitle: "Bicep Curl (Barbell)", kind: "lift" },
  "Alternate Biceps Curl": { hevyTemplateId: "37FCC2BB", hevyTitle: "Bicep Curl (Dumbbell)", kind: "lift" },
  "Biceps Curl Overhand Grip": { hevyTemplateId: "112FC6B7", hevyTitle: "Reverse Curl (Barbell)", kind: "lift" },
  "Hammer Curl": { hevyTemplateId: "7E3BC8B6", hevyTitle: "Hammer Curl (Dumbbell)", kind: "lift" },
  "Cross Hammer Curl": { hevyTemplateId: "32C4D4A2", hevyTitle: "Cross Body Hammer Curl", kind: "lift" },
  "Cable Hammer Curl": { hevyTemplateId: "36E8F14E", hevyTitle: "Hammer Curl (Cable)", kind: "lift" },
  "Incline Biceps Curl Seated": { hevyTemplateId: "8BAB2735", hevyTitle: "Seated Incline Curl (Dumbbell)", kind: "lift" },
  "Preacher Hammer Curl with Dumbbell": { hevyTemplateId: "C01F58D1", hevyTitle: "Seated Incline Hammer Curl (Dumbbell)", kind: "lift" },
  "Wrist Curl": { hevyTemplateId: "95F2E076", hevyTitle: "Seated Wrist Curl (Barbell)", kind: "lift" },

  // --- core / abs ---
  "Cable Pallof Press": { hevyTemplateId: "CC55119B", hevyTitle: "Cable Core Pallof Press", kind: "lift" },
  "Cable Crunch on Knees": { hevyTemplateId: "23A48484", hevyTitle: "Cable Crunch", kind: "lift" },
  "Hanging Straight Leg Raise": { hevyTemplateId: "F8356514", hevyTitle: "Hanging Leg Raise", kind: "lift" },
  "Decline Crunch": { hevyTemplateId: "BC10A922", hevyTitle: "Decline Crunch", kind: "lift" },
  "Crunch with Legs Raised": { hevyTemplateId: "594450D2", hevyTitle: "Bicycle Crunch Raised Legs", kind: "lift" },
  "Russian Twist": { hevyTemplateId: "2982AA23", hevyTitle: "Russian Twist (Weighted)", kind: "lift" },
  "Dumbbell Side Bend": { hevyTemplateId: "026FD047", hevyTitle: "Side Bend (Dumbbell)", kind: "lift" },
  "Side Bend on Bench": { hevyTemplateId: "026FD047", hevyTitle: "Side Bend (Dumbbell)", kind: "lift" },
  "Plank": { hevyTemplateId: "C6C9B8A0", hevyTitle: "Plank", kind: "lift" },
  "Side Plank": { hevyTemplateId: "E3EDA509", hevyTitle: "Side Plank", kind: "lift" },
  "Cross Body Crunch": { hevyTemplateId: "DCF3B31B", hevyTitle: "Crunch", kind: "lift" },
  "Bike Crunch": { hevyTemplateId: "A41C7261", hevyTitle: "Bicycle Crunch", kind: "lift" },
  "Crunch (Sit Up)": { hevyTemplateId: "022DF610", hevyTitle: "Sit Up", kind: "lift" },
  "Ab Machine": { hevyTemplateId: "EB43ADD4", hevyTitle: "Crunch (Machine)", kind: "lift" },
  "Scissors": { hevyTemplateId: "B4F2FF72", hevyTitle: "Ab Scissors", kind: "lift" },
  "Jack Knife": { hevyTemplateId: "D410F649", hevyTitle: "Jack Knife (Suspension)", kind: "lift" },
  "Side Leg Raise": { hevyTemplateId: "09C9F635", hevyTitle: "Lying Leg Raise", kind: "lift" },
  "Torso Twist": { hevyTemplateId: "FBB62888", hevyTitle: "Torso Rotation", kind: "mobility" },

  // --- bodyweight / conditioning ---
  "Push Up": { hevyTemplateId: "392887AA", hevyTitle: "Push Up", kind: "lift" },
  "Bridge": { hevyTemplateId: "CDA23948", hevyTitle: "Glute Bridge", kind: "lift" },
  "Wall Sit": { hevyTemplateId: "C8706C80", hevyTitle: "Wall Sit", kind: "lift" },
  "Step Up": { hevyTemplateId: "128A2381", hevyTitle: "Step Up", kind: "lift" },
  "Lateral Band Walks": { hevyTemplateId: "EC02979E", hevyTitle: "Lateral Band Walks", kind: "lift" },
  "High Knees Running in Place": { hevyTemplateId: "150E076B", hevyTitle: "High Knees", kind: "lift" },
  "Jumping Jack": { hevyTemplateId: "991833C2", hevyTitle: "Jumping Jack", kind: "lift" },

  // ===================================================================
  // Custom templates created for import (no faithful Hevy built-in)
  // ===================================================================

  // --- custom lifts ---
  "Triceps Skull Crusher with Barbell": { hevyTemplateId: "71aee336-125a-4349-b3e5-1ca266a7e1db", hevyTitle: "Skull Crusher (Barbell)", kind: "lift", custom: true },
  "Triceps Skull Crusher with Dumbbell": { hevyTemplateId: "cce55c01-80b0-4b1d-bb14-250585b62979", hevyTitle: "Skull Crusher (Dumbbell)", kind: "lift", custom: true },
  "Decline Triceps Skull Crusher with Dumbbell": { hevyTemplateId: "2280f626-6348-406e-9c3e-a5d4bbd79f0c", hevyTitle: "Decline Skull Crusher (Dumbbell)", kind: "lift", custom: true },
  "Biceps Curl with Barbell Wide Grip": { hevyTemplateId: "2a37e0f8-7cbc-4224-bb0f-522972f08398", hevyTitle: "Wide Grip Biceps Curl (Barbell)", kind: "lift", custom: true },
  "Dumbbell Fly with a Twist": { hevyTemplateId: "b5fceda8-54ad-41c6-a7e7-b9f977fba8f5", hevyTitle: "Chest Fly with Twist (Dumbbell)", kind: "lift", custom: true },
  "Bent Arm Pullover with Dumbbell": { hevyTemplateId: "fa4a3f5d-2cce-4559-a747-fe50308fe286", hevyTitle: "Bent Arm Pullover (Dumbbell)", kind: "lift", custom: true },
  "Pullover with Barbell Wide Grip": { hevyTemplateId: "e7ed611f-6f0c-4f43-9d9b-973289be9610", hevyTitle: "Wide Grip Pullover (Barbell)", kind: "lift", custom: true },
  "Kettlebell Pullover with Legs Raised": { hevyTemplateId: "e5f475cf-983d-4092-b728-d5aa2e56ed48", hevyTitle: "Kettlebell Pullover Legs Raised", kind: "lift", custom: true },
  "Bench Dips with Feet on Floor": { hevyTemplateId: "55f4545b-75b1-466f-be11-3d1c494b7905", hevyTitle: "Bench Dips (Feet on Floor)", kind: "lift", custom: true },
  "Windshield Wipers": { hevyTemplateId: "cad044a6-ed35-44ea-9f81-74583ccce339", hevyTitle: "Windshield Wipers", kind: "lift", custom: true },
  "Superman Lat Pulls": { hevyTemplateId: "e4b57c7a-f8b5-4bb7-a244-ad6ab6f897f5", hevyTitle: "Superman Lat Pulls", kind: "lift", custom: true },
  "External Rotation with Band": { hevyTemplateId: "b8243fc2-f3a6-482b-88b4-41bad45446f8", hevyTitle: "External Rotation (Band)", kind: "lift", custom: true },

  // --- custom stretches ---
  "Calf Push Against Wall Stretch": { hevyTemplateId: "a986c328-b26b-4cf9-ad2d-48f58584f814", hevyTitle: "Calf Wall Stretch", kind: "stretch", custom: true },
  "Cross Arm Stretch": { hevyTemplateId: "32f63df8-5b25-4f72-be16-59c31f6194cb", hevyTitle: "Cross Arm Stretch", kind: "stretch", custom: true },
  "Forearm Extensor Stretch": { hevyTemplateId: "925b5bc1-6e2c-4d8b-b975-9ae31dc9e55a", hevyTitle: "Forearm Extensor Stretch", kind: "stretch", custom: true },
  "Hold Leg Behind Back Stretch": { hevyTemplateId: "5ba9117b-167d-49ef-9825-3cbd0543f61c", hevyTitle: "Leg Behind Back Stretch", kind: "stretch", custom: true },
  "Kneeling Hip Flexor Stretch": { hevyTemplateId: "8ec027d8-ed92-45ce-8ecf-82baacba0b4d", hevyTitle: "Kneeling Hip Flexor Stretch", kind: "stretch", custom: true },
  "Low Angle Doorway Chest Stretch": { hevyTemplateId: "9dd5e42f-c9b7-47b1-bd01-ba7eccbc52ee", hevyTitle: "Doorway Chest Stretch", kind: "stretch", custom: true },
  "Lying Figure Four Stretch": { hevyTemplateId: "a14206ed-2401-425c-8030-efbde2f70dad", hevyTitle: "Lying Figure Four Stretch", kind: "stretch", custom: true },
  "Neck Side Bend Stretch": { hevyTemplateId: "e5371b20-ca6b-412b-954f-6fe467c36533", hevyTitle: "Neck Side Bend Stretch", kind: "stretch", custom: true },
  "Resting on the Wall Calves Stretch": { hevyTemplateId: "f660e462-401e-4b14-8e5f-50d3bd894f6e", hevyTitle: "Wall Calf Stretch (Resting)", kind: "stretch", custom: true },
  "Seated Hip Extensor Stretch with Stretched Leg": { hevyTemplateId: "3914b329-a12c-4057-8d24-40d16e059630", hevyTitle: "Seated Hip Extensor Stretch", kind: "stretch", custom: true },

  // --- custom mobility / activation ---
  "Ankle Circles": { hevyTemplateId: "9854a4c8-4027-418c-a1f4-d18387611b79", hevyTitle: "Ankle Circles", kind: "mobility", custom: true },
  "Ankle Rock Forward": { hevyTemplateId: "795fe866-ef4e-49cf-a491-bcc9caa97c01", hevyTitle: "Ankle Rock Forward", kind: "mobility", custom: true },
  "Hip Circle": { hevyTemplateId: "827872ba-2b55-4230-bc5a-ab8fb769a0ae", hevyTitle: "Hip Circles (Mobility)", kind: "mobility", custom: true },
  "Hip Flexor Pulses": { hevyTemplateId: "9aa6a313-5e35-4556-a277-75f4e971e544", hevyTitle: "Hip Flexor Pulses", kind: "mobility", custom: true },
  "Leg Swings (Front And Side)": { hevyTemplateId: "1c52440b-7386-4203-8967-d9f4201427e9", hevyTitle: "Leg Swings (Front and Side)", kind: "mobility", custom: true },
  "Wall Slides": { hevyTemplateId: "747b524d-5cba-4865-a14d-0234a64fafe3", hevyTitle: "Wall Slides (Shoulder Mobility)", kind: "mobility", custom: true },
  "Wrists Mobility Flow": { hevyTemplateId: "9f40b2a3-b540-41da-9d2c-b54655a2578c", hevyTitle: "Wrist Mobility Flow", kind: "mobility", custom: true },
};

/** Resolve a raw SmartGym exercise name to its Hevy mapping entry, or null if unmapped. */
export function lookupMapping(rawName: string): MapEntry | null {
  return SMARTGYM_EXERCISE_MAP[rawName] ?? null;
}
