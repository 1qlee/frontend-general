import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { matchPath, usePath } from './lib/router';
import { setLastLocation } from './store/progress';
import { Dashboard } from './pages/Dashboard';
import { StartHere } from './pages/StartHere';
import { DayPage } from './pages/DayPage';
import { BlockPage } from './pages/BlockPage';
import { ExercisePage } from './pages/ExercisePage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { PracticeBank } from './pages/PracticeBank';
import { MockInterview } from './pages/MockInterview';
import { Playbook } from './pages/Playbook';
import { Playground } from './pages/Playground';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';

function Routes({ path }: { path: string }) {
  let m: Record<string, string> | null;
  if ((m = matchPath('/', path))) return <Dashboard />;
  if ((m = matchPath('/start', path))) return <StartHere />;
  if ((m = matchPath('/day/:n', path))) return <DayPage dayNumber={Number(m.n)} />;
  if ((m = matchPath('/day/:n/:block', path))) return <BlockPage key={path} dayNumber={Number(m.n)} blockId={m.block} />;
  if ((m = matchPath('/day/:n/:block/:exercise', path))) return <ExercisePage dayNumber={Number(m.n)} blockId={m.block} exerciseId={m.exercise} />;
  if ((m = matchPath('/flashcards', path))) return <FlashcardsPage />;
  if ((m = matchPath('/practice', path))) return <PracticeBank />;
  if ((m = matchPath('/mock', path))) return <MockInterview />;
  if ((m = matchPath('/mock/:mode', path))) return <MockInterview key={path} mode={m.mode} />;
  if ((m = matchPath('/playbook', path))) return <Playbook />;
  if ((m = matchPath('/playbook/:id', path))) return <Playbook docId={m.id} />;
  if ((m = matchPath('/playground', path))) return <Playground />;
  if ((m = matchPath('/settings', path))) return <Settings />;
  return <NotFound />;
}

export function App() {
  const path = usePath();
  useEffect(() => {
    if (path.startsWith('/day/')) setLastLocation(path);
  }, [path]);
  return (
    <Layout>
      <Routes path={path} />
    </Layout>
  );
}
