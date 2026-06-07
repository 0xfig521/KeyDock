import { useState, useEffect } from "react";

interface GitHubStats {
  stars: number;
  downloads: number;
  loading: boolean;
}

export function useGitHubStats(owner: string, repo: string): GitHubStats {
  const [stars, setStars] = useState(0);
  const [downloads, setDownloads] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStats() {
      try {
        const [repoRes, releasesRes] = await Promise.all([
          fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            signal: controller.signal,
            headers: { Accept: "application/vnd.github.v3+json" },
          }),
          fetch(
            `https://api.github.com/repos/${owner}/${repo}/releases?per_page=10`,
            {
              signal: controller.signal,
              headers: { Accept: "application/vnd.github.v3+json" },
            },
          ),
        ]);

        if (repoRes.ok) {
          const repoData = (await repoRes.json()) as {
            stargazers_count?: number;
          };
          setStars(repoData.stargazers_count ?? 0);
        }

        if (releasesRes.ok) {
          const releases = (await releasesRes.json()) as {
            assets?: { download_count: number }[];
          }[];
          const totalDownloads = releases.reduce(
            (sum, release) =>
              sum +
              (release.assets?.reduce(
                (s, a) => s + a.download_count,
                0,
              ) ?? 0),
            0,
          );
          setDownloads(totalDownloads);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to fetch GitHub stats:", err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    return () => controller.abort();
  }, [owner, repo]);

  return { stars, downloads, loading };
}
