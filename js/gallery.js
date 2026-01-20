// Public gallery - shows a random published image

async function loadRandomImage() {
  const container = document.getElementById("random-image");

  const { data: images, error } = await db
    .from("images")
    .select("*")
    .eq("published", true);

  if (error) {
    console.error("Error loading images:", error);
    return;
  }

  const randomImage = images[Math.floor(Math.random() * images.length)];
  const url = db.storage.from("images").getPublicUrl(randomImage.storage_path)
    .data.publicUrl;

  container.innerHTML = `<img src="${url}" alt="${randomImage.filename}">`;
  document.documentElement.style.colorScheme = randomImage.dark ? "dark" : "light";
}

loadRandomImage();
