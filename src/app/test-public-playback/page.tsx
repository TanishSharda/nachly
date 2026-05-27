import TestPublicPlayback from '@/components/TestPublicPlayback'

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Page({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {}
  const src = Array.isArray(params?.src) ? params?.src[0] : params?.src
  return (
    <main>
      <TestPublicPlayback src={src as string | undefined} />
    </main>
  )
}
