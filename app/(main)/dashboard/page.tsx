import { getCollections } from '@/actions/collection'
import { getJournalEntries } from '@/actions/journal'
import Collections from './_components/collection'
import MoodAnalytics from './_components/mood-analytics'

const Dashboard = async () => {
  const collections = await getCollections()
  const entriesData = await getJournalEntries()

  if (!entriesData?.success || !entriesData.data?.entries) {
    return <div>Error loading entries</div>
  }

  const entriesByCollection = entriesData.data.entries.reduce<Record<string, typeof entriesData.data.entries[number][]>>(
    (acc, entry) => {
      const collectionId = entry.collectionId || 'unorganized'
      if (!acc[collectionId]) {
        acc[collectionId] = []
      }
      acc[collectionId].push(entry)
      return acc
    },{});

  return (
    <div className='px-4 py-8 space-y-8'>
      <section className='space-y-4'>
        <MoodAnalytics/>
      </section>


      <Collections collections={collections} entriesByCollection={entriesByCollection} />
  
    </div>
  )
}

export default Dashboard
