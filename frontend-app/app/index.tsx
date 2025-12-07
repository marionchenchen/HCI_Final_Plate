// frontend-app/app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // 將根路徑 / 導向到 / (main) 群組的根目錄，也就是 MapScreen (index.tsx)
  return <Redirect href="/(main)" />; 
}