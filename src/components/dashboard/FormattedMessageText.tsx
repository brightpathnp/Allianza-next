'use client';

import { Fragment } from 'react';

interface FormattedMessageTextProps {
  text: string;
  studentName?: string;
  studentRefNo?: string;
  className?: string;
}

export function FormattedMessageText({
  text,
  studentName,
  studentRefNo,
  className = '',
}: FormattedMessageTextProps) {
  if (!text) return null;

  const cleanText = text.replace(/\*\*/g, '');

  const boldTargets: string[] = [];

  if (studentName && studentName.trim()) {
    boldTargets.push(studentName.trim());
  }

  if (studentRefNo && studentRefNo.trim()) {
    boldTargets.push(studentRefNo.trim());
  }

  const refPatterns = cleanText.match(/\b(STU|APP|REF|STU-202[0-9])[-A-Za-z0-9_]+\b/gi);
  if (refPatterns) {
    refPatterns.forEach((match) => {
      if (!boldTargets.includes(match)) {
        boldTargets.push(match);
      }
    });
  }

  const refMatches = cleanText.match(/Ref:\s*([A-Za-z0-9-]+)/gi);
  if (refMatches) {
    refMatches.forEach((match) => {
      const refVal = match.replace(/^Ref:\s*/i, '').trim();
      if (refVal && !boldTargets.includes(refVal)) {
        boldTargets.push(refVal);
      }
    });
  }

  const genericExclusions = ['student', 'students', 'the student', 'a student', 'applicant', 'student application', 'application', 'ref', 'app'];

  const uniqueTargets = Array.from(new Set(boldTargets.filter((t) => {
    if (!t || t.trim().length <= 1) return false;
    if (genericExclusions.includes(t.trim().toLowerCase())) return false;
    return true;
  }))).sort((a, b) => b.length - a.length);

  const renderLineWithBold = (lineText: string, keyPrefix: string | number) => {
    if (uniqueTargets.length === 0) {
      return <span key={keyPrefix}>{lineText}</span>;
    }

    const escapedTargets = uniqueTargets.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTargets.join('|')})`, 'gi');
    const parts = lineText.split(regex);

    return (
      <span key={keyPrefix}>
        {parts.map((part, pIdx) => {
          const isMatch = uniqueTargets.some((t) => t.toLowerCase() === part.toLowerCase());
          if (isMatch) {
            return (
              <strong key={pIdx} className="font-bold text-slate-900">
                {part}
              </strong>
            );
          }
          return part;
        })}
      </span>
    );
  };

  const rawLines = cleanText.split('\n');
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  rawLines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed === '') {
      if (currentBlock.length > 0) {
        blocks.push([...currentBlock]);
        currentBlock = [];
      }
    } else {
      currentBlock.push(line);
      if (currentBlock.length === 2) {
        blocks.push([...currentBlock]);
        currentBlock = [];
      }
    }
  });

  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  return (
    <div className={`space-y-3.5 ${className}`}>
      {blocks.map((blockLines, bIdx) => (
        <p key={bIdx} className="leading-relaxed">
          {blockLines.map((line, lIdx) => (
            <Fragment key={lIdx}>
              {lIdx > 0 && <br />}
              {renderLineWithBold(line, `${bIdx}-${lIdx}`)}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}

export default FormattedMessageText;