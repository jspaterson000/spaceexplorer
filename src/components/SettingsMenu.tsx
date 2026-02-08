import { Menu } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { useCosmicStore } from '../bridge/useCosmicStore';
import { cosmicActions } from '../bridge/CosmicActions';

export function SettingsMenu() {
  const { satellitesEnabled, missionActive } = useCosmicStore();

  if (missionActive) return null;

  return (
    <div className="pointer-events-auto fixed top-5 right-5 z-[1000]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full bg-cosmos/70 border-white/15 text-white/70 backdrop-blur-xl hover:bg-nebula/80 hover:border-white/30 hover:text-white/90"
          >
            <Menu className="h-[18px] w-[18px]" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-[180px]">
          <DropdownMenuLabel>Missions</DropdownMenuLabel>
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => cosmicActions.startMission()}
          >
            <span className="text-ice">◈</span>
            <span>Artemis II</span>
            <Badge className="ml-auto text-[9px]">Preview</Badge>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Display</DropdownMenuLabel>
          <div className="flex items-center justify-between px-2 py-2">
            <label className="text-xs text-foreground/80 cursor-pointer" htmlFor="satellite-switch">
              Show Satellites
            </label>
            <Switch
              id="satellite-switch"
              checked={satellitesEnabled}
              onCheckedChange={(checked) => cosmicActions.toggleSatellites(checked)}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
