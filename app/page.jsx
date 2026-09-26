import ClientDashboard from './ClientDashboard';

export default function Home() {
  // 1. The Vercel server cannot read browser localStorage.
  // 2. We pass an empty array to bypass the server-side fetch.
  // 3. ClientDashboard mounts in the browser, reads the saved passcode, and fetches the tasks directly.
  return <ClientDashboard initialTasks={[]} />;
}