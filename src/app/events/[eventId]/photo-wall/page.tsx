import { redirect } from "next/navigation";

export default async function EventPhotoWallRedirect({
  params,
}: PageProps<"/events/[eventId]/photo-wall">) {
  const { eventId } = await params;
  redirect(`/wall/${eventId}`);
}
