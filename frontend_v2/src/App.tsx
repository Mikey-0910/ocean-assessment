import { useAppContext } from '@/hooks/useAppContext';
import { WelcomePage } from '@/pages/WelcomePage';
import { AssessmentPage } from '@/pages/AssessmentPage';
import { ReportPage } from '@/pages/ReportPage';

export default function App() {
  const { assessmentPhase } = useAppContext();

  if (assessmentPhase === 'welcome') {
    return (
      <div className="assessment-bg">
        <WelcomePage />
      </div>
    );
  }

  if (assessmentPhase === 'assessment') {
    return (
      <div className="assessment-bg">
        <AssessmentPage />
      </div>
    );
  }

  return <ReportPage />;
}
