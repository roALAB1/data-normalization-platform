/**
 * Shared Footer Component
 * 
 * Reusable footer for all pages with:
 * - Dynamic version display
 * - GitHub link with hover preview
 * - Responsive design
 */

import { useState, useEffect } from 'react';
import { Github } from 'lucide-react';
import { getVersion, clearVersionCache } from '@shared/versionManager';

interface FooterProps {
  /**
   * Optional custom description text
   * If not provided, defaults to "Data Normalization Platform"
   */
  description?: string;
  /**
   * Optional custom GitHub URL
   * Defaults to main repository
   */
  githubUrl?: string;
}

export default function Footer({ 
  description = 'Data Normalization Platform',
  githubUrl = 'https://github.com/roALAB1/data-normalization-platform'
}: FooterProps) {
  const [version, setVersion] = useState<string>('');
  const [showHover, setShowHover] = useState(false);

  // Get version on mount and clear any old cache
  useEffect(() => {
    // Clear old localStorage cache
    clearVersionCache();
    
    // Get fresh version
    const v = getVersion();
    setVersion(v);
    
    // Log for debugging
    console.log('[Footer] Version loaded:', v);
  }, []);

  return (
    <footer className="border-t bg-white/80 backdrop-blur-sm mt-12">
      <div className="container mx-auto px-4 py-6 flex justify-center items-center gap-4 text-sm text-muted-foreground">
        {/* Version and Description */}
        <span>
          {version && `v${version}`} • {description}
        </span>

        {/* Separator */}
        <span>•</span>

        {/* GitHub Link with Hover Preview */}
        <div className="relative group">
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            onMouseEnter={() => setShowHover(true)}
            onMouseLeave={() => setShowHover(false)}
            title="View on GitHub"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </a>

          {/* Hover Preview Tooltip */}
          {showHover && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none z-50">
              View releases on GitHub
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
