export const IMAGE_SIZES = [
  { label: "1:1 (1024×1024)", value: "1024*1024", ratio: "1:1" },
  { label: "1:1 Large (1280×1280)", value: "1280*1280", ratio: "1:1" },
  { label: "3:2 (1216×832)", value: "1216*832", ratio: "3:2" },
  { label: "2:3 (832×1216)", value: "832*1216", ratio: "2:3" },
  { label: "4:3 (1152×896)", value: "1152*896", ratio: "4:3" },
  { label: "3:4 (896×1152)", value: "896*1152", ratio: "3:4" },
  { label: "16:9 (1344×768)", value: "1344*768", ratio: "16:9" },
  { label: "9:16 (768×1344)", value: "768*1344", ratio: "9:16" },
] as const;
