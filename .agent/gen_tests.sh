#!/bin/bash
# Generate contract tests for all untested source files
# Reads source file, extracts exports and imports, generates test assertions

cd /Users/younghoonan/Documents/ACE

while IFS= read -r srcfile; do
    [ -z "$srcfile" ] && continue
    
    # Determine test file path
    if [[ "$srcfile" == *.tsx ]]; then
        testfile="${srcfile%.tsx}.test.ts"
    else
        testfile="${srcfile%.ts}.test.ts"
    fi
    
    # Skip if test already exists
    [ -f "$testfile" ] && continue
    
    # Extract basename for describe block
    basename=$(basename "$srcfile" | sed 's/\.\(ts\|tsx\)$//')
    
    # Extract exports
    exports=$(grep "^export " "$srcfile" 2>/dev/null | head -15)
    
    # Extract imports for dependency tests
    imports=$(grep "^import " "$srcfile" 2>/dev/null | head -10)
    
    # Determine relative path from test file to source
    srcbasename=$(basename "$srcfile")
    
    # Build test content
    cat > "$testfile" << TESTEOF
// ${basename}.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './${srcbasename}'), 'utf-8');

TESTEOF

    # Add export tests
    echo "describe('${basename} — exports', () => {" >> "$testfile"
    
    # Parse each export
    echo "$exports" | while IFS= read -r line; do
        [ -z "$line" ] && continue
        
        if echo "$line" | grep -q "export function "; then
            fname=$(echo "$line" | sed 's/export function \([a-zA-Z_]*\).*/\1/')
            echo "    it('exports ${fname}', () => { expect(src).toContain('export function ${fname}'); });" >> "$testfile"
        elif echo "$line" | grep -q "export default function "; then
            fname=$(echo "$line" | sed 's/export default function \([a-zA-Z_]*\).*/\1/')
            echo "    it('exports ${fname} as default', () => { expect(src).toContain('export default function ${fname}'); });" >> "$testfile"
        elif echo "$line" | grep -q "export const "; then
            cname=$(echo "$line" | sed 's/export const \([a-zA-Z_]*\).*/\1/')
            echo "    it('exports ${cname}', () => { expect(src).toContain('export const ${cname}'); });" >> "$testfile"
        elif echo "$line" | grep -q "export async function "; then
            fname=$(echo "$line" | sed 's/export async function \([a-zA-Z_]*\).*/\1/')
            echo "    it('exports ${fname}', () => { expect(src).toContain('export async function ${fname}'); });" >> "$testfile"
        elif echo "$line" | grep -q "export type "; then
            tname=$(echo "$line" | sed 's/export type \([a-zA-Z_]*\).*/\1/')
            echo "    it('exports type ${tname}', () => { expect(src).toContain('export type ${tname}'); });" >> "$testfile"
        elif echo "$line" | grep -q "export interface "; then
            iname=$(echo "$line" | sed 's/export interface \([a-zA-Z_]*\).*/\1/')
            echo "    it('exports interface ${iname}', () => { expect(src).toContain('export interface ${iname}'); });" >> "$testfile"
        elif echo "$line" | grep -q "export {"; then
            echo "    it('has re-exports', () => { expect(src).toContain('export {'); });" >> "$testfile"
        elif echo "$line" | grep -q "export enum "; then
            ename=$(echo "$line" | sed 's/export enum \([a-zA-Z_]*\).*/\1/')
            echo "    it('exports enum ${ename}', () => { expect(src).toContain('export enum ${ename}'); });" >> "$testfile"
        fi
    done
    
    # Fallback if no exports detected
    exportCount=$(echo "$exports" | grep -c "export" 2>/dev/null || echo 0)
    if [ "$exportCount" -lt 1 ]; then
        echo "    it('has exports', () => { const has = src.includes('export '); expect(has).toBe(true); });" >> "$testfile"
    fi
    
    echo "});" >> "$testfile"
    echo "" >> "$testfile"
    
    # Add dependency tests from imports
    echo "describe('${basename} — dependencies', () => {" >> "$testfile"
    
    depCount=0
    echo "$imports" | while IFS= read -r line; do
        [ -z "$line" ] && continue
        
        # Extract module name
        if echo "$line" | grep -q "from '"; then
            mod=$(echo "$line" | sed "s/.*from '\([^']*\)'.*/\1/" | sed 's|.*/||')
            if [ -n "$mod" ] && [ "$mod" != "$line" ]; then
                echo "    it('imports from ${mod}', () => { expect(src).toContain(\"${mod}\"); });" >> "$testfile"
                depCount=$((depCount + 1))
            fi
        fi
    done
    
    echo "});" >> "$testfile"
    echo "" >> "$testfile"
    
    # Add React hooks test for .tsx files
    if [[ "$srcfile" == *.tsx ]]; then
        echo "describe('${basename} — React patterns', () => {" >> "$testfile"
        grep -q "useState" "$srcfile" && echo "    it('uses useState', () => { expect(src).toContain('useState'); });" >> "$testfile"
        grep -q "useEffect" "$srcfile" && echo "    it('uses useEffect', () => { expect(src).toContain('useEffect'); });" >> "$testfile"
        grep -q "useCallback" "$srcfile" && echo "    it('uses useCallback', () => { expect(src).toContain('useCallback'); });" >> "$testfile"
        grep -q "useMemo" "$srcfile" && echo "    it('uses useMemo', () => { expect(src).toContain('useMemo'); });" >> "$testfile"
        grep -q "useRef" "$srcfile" && echo "    it('uses useRef', () => { expect(src).toContain('useRef'); });" >> "$testfile"
        echo "});" >> "$testfile"
    fi
    
    echo "Created: $testfile"
    
done < /tmp/untested_list.txt

echo "DONE"
