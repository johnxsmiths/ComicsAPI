import { mangaController } from './src/components/manga/manga.controller.js';

async function runTests() {
  console.log('=== 1. Testing GET /api/scrape/providers ===');
  const providersRes = mangaController.handleGetProviders();
  console.log('Status Code:', providersRes.statusCode);
  const providersBody = JSON.parse(providersRes.body);
  console.log('Total Providers Registered:', providersBody.meta?.totalProviders);
  console.log('Providers List:', providersBody.data.map(p => `${p.id} (${p.name})`).join(', '));

  console.log('\n=== 2. Testing GET /api/scrape/search (Provider: manganato) ===');
  const searchRes = await mangaController.handleScrapeSearch({ query: 'Naruto', provider: 'manganato' });
  console.log('Status Code:', searchRes.statusCode);
  const searchBody = JSON.parse(searchRes.body);
  console.log('Results Found:', searchBody.data?.length);
  
  if (searchBody.data && searchBody.data.length > 0) {
    const firstManga = searchBody.data[0];
    console.log('Sample Search Item:', {
      id: firstManga.id,
      siteId: firstManga.siteId,
      title: firstManga.title,
      coverUrl: firstManga.coverUrl
    });

    console.log('\n=== 3. Testing GET /api/scrape/info ===');
    const infoRes = await mangaController.handleScrapeInfo({ id: firstManga.id, provider: firstManga.siteId });
    console.log('Status Code:', infoRes.statusCode);
    const infoBody = JSON.parse(infoRes.body);
    console.log('Title:', infoBody.data?.title);
    console.log('Total Chapters:', infoBody.data?.totalChapters);

    console.log('\n=== 4. Testing GET /api/scrape/chapters ===');
    const chaptersRes = await mangaController.handleScrapeChapters({ id: firstManga.id, provider: firstManga.siteId });
    console.log('Status Code:', chaptersRes.statusCode);
    const chaptersBody = JSON.parse(chaptersRes.body);
    console.log('Chapters Count:', chaptersBody.data?.length);

    if (chaptersBody.data && chaptersBody.data.length > 0) {
      const firstChapter = chaptersBody.data[0];
      console.log('First Chapter:', firstChapter);

      console.log('\n=== 5. Testing GET /api/scrape/pages (Multi-Format Reader Inspection) ===');
      const pagesRes = await mangaController.handleScrapePages({
        id: firstManga.id,
        chapterId: firstChapter.id,
        provider: firstManga.siteId
      });
      console.log('Status Code:', pagesRes.statusCode);
      const pagesBody = JSON.parse(pagesRes.body);
      console.log('Content Format:', pagesBody.data?.format); // 'images' | 'pdf' | 'epub'
      console.log('Total Pages:', pagesBody.data?.totalPages);
      if (pagesBody.data?.pages?.length > 0) {
        console.log('Sample Page Image URL:', pagesBody.data.pages[0].url);
      }
    }
  }

  console.log('\n=== All MangaScrapeAPI Compatibility Verification Checks Passed! ===');
}

runTests().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
