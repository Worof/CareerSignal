import type { Metadata } from "next";
import Link from "next/link";
import { UploadDropzone } from "@/components/analytics/upload-dropzone";
import { PageHeader } from "@/components/ui/misc";
import { isAIConfigured } from "@/lib/ai";

export const metadata: Metadata = { title: "Upload screenshot" };

export default function UploadPage() {
  return (
    <>
      <PageHeader title="Upload a screenshot" description="Upload a screenshot of LinkedIn analytics, audience demographics or search appearances." actions={<Link href="/analytics/new" className="text-sm text-primary hover:underline">Enter numbers manually instead →</Link>} />
      <UploadDropzone aiConfigured={isAIConfigured()} />
    </>
  );
}
