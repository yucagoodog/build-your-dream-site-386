export const IMAGE_SIZES = [
  // ~2M pixel tier (High)
  { label: "1:1 High (1408×1408)", value: "1408*1408", ratio: "1:1" },
  { label: "3:2 High (1728×1152)", value: "1728*1152", ratio: "3:2" },
  { label: "2:3 High (1152×1728)", value: "1152*1728", ratio: "2:3" },
  { label: "4:3 High (1664×1216)", value: "1664*1216", ratio: "4:3" },
  { label: "3:4 High (1216×1664)", value: "1216*1664", ratio: "3:4" },
  { label: "16:9 High (1920×1088)", value: "1920*1088", ratio: "16:9" },
  { label: "9:16 High (1088×1920)", value: "1088*1920", ratio: "9:16" },
  { label: "21:9 High (2176×960)", value: "2176*960", ratio: "21:9" },
  { label: "9:21 High (960×2176)", value: "960*2176", ratio: "9:21" },

  // ~1M pixel tier (Medium)
  { label: "1:1 (1024×1024)", value: "1024*1024", ratio: "1:1" },
  { label: "3:2 (1216×832)", value: "1216*832", ratio: "3:2" },
  { label: "2:3 (832×1216)", value: "832*1216", ratio: "2:3" },
  { label: "4:3 (1152×896)", value: "1152*896", ratio: "4:3" },
  { label: "3:4 (896×1152)", value: "896*1152", ratio: "3:4" },
  { label: "16:9 (1344×768)", value: "1344*768", ratio: "16:9" },
  { label: "9:16 (768×1344)", value: "768*1344", ratio: "9:16" },
  { label: "21:9 (1536×640)", value: "1536*640", ratio: "21:9" },
  { label: "9:21 (640×1536)", value: "640*1536", ratio: "9:21" },

  // ~100K pixel tier (Low / Thumbnail)
  { label: "1:1 Low (320×320)", value: "320*320", ratio: "1:1" },
  { label: "3:2 Low (384×256)", value: "384*256", ratio: "3:2" },
  { label: "4:3 Low (448×320)", value: "448*320", ratio: "4:3" },
  { label: "16:9 Low (448×256)", value: "448*256", ratio: "16:9" },
  { label: "21:9 Low (576×256)", value: "576*256", ratio: "21:9" },
] as const;
