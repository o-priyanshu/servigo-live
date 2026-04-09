import SkeletonBlock from "@/components/admin/shared/SkeletonBlock";
import Panel from "@/components/admin/shared/Panel";

export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <Panel title="Loading Secure Console">
        <SkeletonBlock rows={3} />
      </Panel>
      <Panel title="Preparing Data Streams">
        <SkeletonBlock rows={6} />
      </Panel>
    </div>
  );
}

