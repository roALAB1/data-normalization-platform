import { useState } from 'react';
import { NameEnhanced, NAME_ENHANCED_VERSION, CREDENTIALS_COUNT } from '@/lib/NameEnhanced';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Test page to verify credential stripping is working
 */
export default function TestCredentials() {
  const [results, setResults] = useState<any[]>([]);

  const testNames = [
    'Jennifer R Berman MD',
    'John Bell CFP',
    'Alison Theiss MSc CSC ABS',
    'Meg Richichi MS LAc',
    'Darshana naik PT DPT',
    'Stephanie Molden MD FPMRS',
    'John Smith M.D.',
    'Jane Doe CFP®',
    'Michael March',
    'Jennifer Berman, MD',
    'Emily Bouch (she/her)',
  ];

  const runTests = () => {
    const testResults = testNames.map(input => {
      const name = new NameEnhanced(input);
      return {
        input,
        firstName: name.firstName,
        lastName: name.lastName,
        full: name.full,
        suffix: name.suffix,
        isValid: name.isValid,
      };
    });
    setResults(testResults);
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Credential Stripping Test</CardTitle>
          <div className="text-sm text-muted-foreground mt-2">
            Version: {NAME_ENHANCED_VERSION} | Credentials: {CREDENTIALS_COUNT}
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={runTests} className="mb-4">
            Run Tests
          </Button>

          {results.length > 0 && (
            <div className="space-y-4">
              {results.map((result, idx) => (
                <div key={idx} className="border p-4 rounded">
                  <div className="font-bold mb-2">Input: {result.input}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>First Name: {result.firstName || '(empty)'}</div>
                    <div>Last Name: {result.lastName || '(empty)'}</div>
                    <div>Full: {result.full || '(empty)'}</div>
                    <div>Suffix: {result.suffix || '(empty)'}</div>
                    <div>Valid: {result.isValid ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
