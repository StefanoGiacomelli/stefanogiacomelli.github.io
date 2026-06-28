/**
 * tex-parser.js
 * Utility to fetch and parse artworks.tex
 */

export async function fetchAndParseArtworks() {
  try {
    const response = await fetch('data/artworks.tex');
    if (!response.ok) {
      throw new Error(`Failed to fetch artworks.tex: ${response.statusText}`);
    }
    const texString = await response.text();
    return parseTexArtworks(texString);
  } catch (error) {
    console.error('Error fetching/parsing artworks.tex:', error);
    return [];
  }
}

export function parseTexArtworks(texString) {
  const artworks = [];
  const keyword = "\\resumePOR";
  let searchIndex = 0;

  while (true) {
    const startIndex = texString.indexOf(keyword, searchIndex);
    if (startIndex === -1) break;

    let currentIndex = startIndex + keyword.length;
    const args = [];

    // Extract the 3 arguments
    for (let i = 0; i < 3; i++) {
      while (currentIndex < texString.length && texString[currentIndex] !== '{') {
        currentIndex++;
      }
      if (currentIndex >= texString.length) break;

      let braceCount = 1;
      let argContent = "";
      currentIndex++; // skip opening brace

      while (currentIndex < texString.length && braceCount > 0) {
        if (texString[currentIndex] === '{') braceCount++;
        else if (texString[currentIndex] === '}') braceCount--;
        
        if (braceCount > 0) {
          argContent += texString[currentIndex];
        }
        currentIndex++;
      }
      args.push(argContent.trim());
    }

    if (args.length === 3) {
      artworks.push({
        title: args[0],
        content: args[1],
        year: args[2]
      });
    }

    searchIndex = currentIndex;
  }

  // Post-process the extracted data
  return artworks.map(art => {
    let rawContent = art.content;
    rawContent = rawContent.replace(/^\\\\/, '').trim();
    
    // Split by \\ to get individual items
    const parts = rawContent.split('\\\\').map(p => p.trim()).filter(p => p);
    
    let location = "";
    let items = [];
    
    if (parts.length > 0) {
        // The last part is typically the location
        location = parts.pop();
        items = parts;
    }

    // Replace \textit{...} with HTML tags
    const parsedItems = items.map(item => {
        return item.replace(/\\textit\{([^}]+)\}/g, '<span class="italic text-accent-cyan">$1</span>');
    });

    return {
      title: art.title,
      items: parsedItems,
      location: location,
      year: art.year
    };
  });
}
