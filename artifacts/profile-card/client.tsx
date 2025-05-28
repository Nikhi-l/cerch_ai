import ProfileCard, { ProfileCardProps } from '@/components/ProfileCard';
import { Artifact } from '@/components/create-artifact';

export const profileCardArtifact = new Artifact<'profile_card', ProfileCardProps>({
  kind: 'profile_card',
  description: 'Profile card display',
  initialize: async () => {},
  onStreamPart: ({ streamPart, setArtifact, setMetadata }) => {
    if (streamPart.type === 'profile-card-delta') {
      try {
        const data = JSON.parse(streamPart.content as string) as ProfileCardProps;
        setMetadata(data);
        setArtifact((draft) => ({ ...draft, isVisible: true, status: 'streaming' }));
      } catch {}
    }
  },
  content: ({ metadata }) => {
    if (!metadata) return null;
    return <ProfileCard {...metadata} />;
  },
  actions: [],
  toolbar: [],
});
