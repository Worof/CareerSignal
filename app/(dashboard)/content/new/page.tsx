import type { Metadata } from "next";
import { PostForm } from "@/components/content/post-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { createPostAction } from "../actions";

export const metadata: Metadata = { title: "Add post" };

export default function NewPostPage() {
  return (<><PageHeader title="Add a post" description="Add the post first, then record its performance per reporting period." /><Card><CardContent className="pt-5"><PostForm action={createPostAction} submitLabel="Create post" /></CardContent></Card></>);
}
