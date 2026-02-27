// Atlas Cloud WAN 2.6 Image Edit: valid pixel range 589,824 – 1,638,400
export const IMAGE_SIZES = [
  // 1:1
  { label: "1:1 Large (1280×1280)", value: "1280*1280", ratio: "1:1" },
  { label: "1:1 (1024×1024)", value: "1024*1024", ratio: "1:1" },

  // 3:2 / 2:3
  { label: "3:2 (1216×832)", value: "1216*832", ratio: "3:2" },
  { label: "2:3 (832×1216)", value: "832*1216", ratio: "2:3" },

  // 4:3 / 3:4
  { label: "4:3 (1152×896)", value: "1152*896", ratio: "4:3" },
  { label: "3:4 (896×1152)", value: "896*1152", ratio: "3:4" },

  // 16:9 / 9:16
  { label: "16:9 (1344×768)", value: "1344*768", ratio: "16:9" },
  { label: "9:16 (768×1344)", value: "768*1344", ratio: "9:16" },

  // 21:9 / 9:21
  { label: "21:9 (1536×640)", value: "1536*640", ratio: "21:9" },
  { label: "9:21 (640×1536)", value: "640*1536", ratio: "9:21" },
] as const;
