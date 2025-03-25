import { 
  HomeIcon, 
  DocumentTextIcon, 
  ChatBubbleLeftRightIcon,
  FolderIcon,
  UserGroupIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Dokumente', href: '/documents', icon: DocumentTextIcon },
  { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon },
  { name: 'Dateien', href: '/files', icon: FolderIcon },
  { name: 'Agenten', href: '/agents', icon: BeakerIcon },
  { name: 'Team', href: '/team', icon: UserGroupIcon },
]; 