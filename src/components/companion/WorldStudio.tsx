import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Sparkles, Check, X, ChevronDown, ChevronUp } from "lucide-react";

const TIMES = ["morning", "afternoon", "evening", "night"] as const;
const WEATHERS = ["clear", "rainy", "cloudy"] as const;

const TIME_EMOJI: Record<string, string> = { morning: "🌅", afternoon: "☀️", evening: "🌇", night: "🌙" };

interface Props {
  companion: any;
  rooms: any[];
  roomVariants: any[];
  generateRoomVariant: (roomId: string, timeOfDay: string, weather?: string) => Promise<void>;
  updateVariantStatus: (id: string, status: "approved" | "rejected") => Promise<void>;
  createRoom: (name: string, icon: string, prompt: string, type?: string) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  generating: boolean;
}

export function WorldStudio({ rooms, roomVariants, generateRoomVariant, updateVariantStatus, createRoom, deleteRoom, generating }: Props) {
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", icon: "🏠", prompt: "" });

  const handleAddRoom = async () => {
    if (!newRoom.name.trim() || !newRoom.prompt.trim()) return;
    await createRoom(newRoom.name, newRoom.icon, newRoom.prompt);
    setNewRoom({ name: "", icon: "🏠", prompt: "" });
    setShowAddRoom(false);
  };

  const getVariantsForRoom = (roomId: string) =>
    roomVariants.filter(v => v.room_id === roomId);

  const getVariantStatus = (roomId: string, time: string) => {
    const variants = getVariantsForRoom(roomId).filter(v => v.time_of_day === time);
    const approved = variants.find(v => v.status === "approved");
    if (approved) return { status: "approved", variant: approved };
    if (variants.length > 0) return { status: "draft", variant: variants[0] };
    return { status: "none", variant: null };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rooms & Locations</Label>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddRoom(!showAddRoom)}>
          <Plus className="h-3 w-3" /> Add Room
        </Button>
      </div>

      {showAddRoom && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={newRoom.icon}
                onChange={e => setNewRoom(p => ({ ...p, icon: e.target.value }))}
                className="w-10 rounded-md bg-input border-0 px-2 py-1.5 text-center text-sm"
                maxLength={2}
              />
              <input
                value={newRoom.name}
                onChange={e => setNewRoom(p => ({ ...p, name: e.target.value }))}
                placeholder="Room name..."
                className="flex-1 rounded-md bg-input border-0 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <input
              value={newRoom.prompt}
              onChange={e => setNewRoom(p => ({ ...p, prompt: e.target.value }))}
              placeholder="Describe the room for AI generation..."
              className="w-full rounded-md bg-input border-0 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <Button size="sm" className="w-full text-xs" onClick={handleAddRoom}>
              Create Room
            </Button>
          </CardContent>
        </Card>
      )}

      {rooms.map((room: any) => {
        const isExpanded = expandedRoom === room.id;
        const variants = getVariantsForRoom(room.id);
        const approvedCount = variants.filter(v => v.status === "approved").length;

        return (
          <Card key={room.id}>
            <CardContent className="p-0">
              <button
                onClick={() => setExpandedRoom(isExpanded ? null : room.id)}
                className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors"
              >
                <span className="text-lg">{room.icon}</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{room.room_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {approvedCount}/{TIMES.length} time variants approved
                  </p>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3">
                  <p className="text-[10px] text-muted-foreground italic">{room.base_prompt}</p>

                  {/* Time of day grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {TIMES.map(time => {
                      const { status, variant } = getVariantStatus(room.id, time);
                      return (
                        <div key={time} className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs">{TIME_EMOJI[time]}</span>
                            <span className="text-xs capitalize">{time}</span>
                            {status === "approved" && <Check className="h-3 w-3 text-green-400" />}
                          </div>

                          {variant?.image_url ? (
                            <div className="relative group aspect-video rounded-md overflow-hidden bg-muted">
                              <img src={variant.image_url} alt="" className="w-full h-full object-cover" />
                              {variant.status === "draft" && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => updateVariantStatus(variant.id, "approved")}
                                    className="h-7 w-7 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center"
                                  >
                                    <Check className="h-3.5 w-3.5 text-white" />
                                  </button>
                                  <button
                                    onClick={() => updateVariantStatus(variant.id, "rejected")}
                                    className="h-7 w-7 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center"
                                  >
                                    <X className="h-3.5 w-3.5 text-white" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : variant ? (
                            <div className="aspect-video rounded-md bg-muted flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full h-auto aspect-video text-xs gap-1 border-dashed"
                              disabled={generating}
                              onClick={() => generateRoomVariant(room.id, time)}
                            >
                              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                              Generate
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-xs text-destructive hover:text-destructive gap-1"
                    onClick={() => deleteRoom(room.id)}
                  >
                    <Trash2 className="h-3 w-3" /> Delete Room
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
