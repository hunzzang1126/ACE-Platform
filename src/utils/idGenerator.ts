import { v4 as uuidv4 } from 'uuid';

/** 짧은 고유 ID 생성 (8자) */
export function shortId(): string {
    return uuidv4().slice(0, 8);
}

/** 전체 UUID 생성 */
export { v4 as generateId } from 'uuid';
