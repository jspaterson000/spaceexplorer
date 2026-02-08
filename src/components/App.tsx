import { TitleCard } from './TitleCard';
import { SettingsMenu } from './SettingsMenu';
import { JourneyDock } from './JourneyDock';
import { ScaleLevelNavComponent } from './ScaleLevelNav';
import { TimeControlsComponent } from './TimeControls';
import { InfoCardComponent } from './InfoCard';
import { MissionOverlay } from './MissionOverlay';
import { TransitionOverlay } from './TransitionOverlay';

export function App() {
  return (
    <>
      <TitleCard />
      <SettingsMenu />
      <JourneyDock />
      <ScaleLevelNavComponent />
      <TimeControlsComponent />
      <InfoCardComponent />
      <MissionOverlay />
      <TransitionOverlay />
    </>
  );
}
